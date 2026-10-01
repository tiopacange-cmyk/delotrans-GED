<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\DocumentShare;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Partage d'un document par lien public, sans compte.
 */
class ShareTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private const PDF = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n";

    private Document $document;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('nas');
        Sanctum::actingAs($this->admin());

        $folderId = $this->postJson('/api/v1/folders', ['name' => 'Partages'])->assertCreated()->json('data.id');
        $documentId = $this->post('/api/v1/documents', [
            'file' => UploadedFile::fake()->createWithContent('devis.pdf', self::PDF),
            'folder_id' => $folderId,
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

        $this->document = Document::findOrFail($documentId);
    }

    private function partager(array $options = []): DocumentShare
    {
        $id = $this->postJson("/api/v1/documents/{$this->document->id}/shares", $options)
            ->assertCreated()->json('data.id');

        // La suite se passe sans compte
        $this->app['auth']->forgetGuards();

        return DocumentShare::findOrFail($id);
    }

    public function test_partage_sans_mot_de_passe(): void
    {
        $share = $this->partager();

        $this->getJson("/api/v1/public/shares/{$share->token}")
            ->assertOk()
            ->assertJson(['data' => ['document_name' => 'devis.pdf', 'requires_password' => false]]);

        $reponse = $this->get("/api/v1/public/shares/{$share->token}/download")->assertOk();
        $this->assertSame(self::PDF, $reponse->streamedContent());
        $this->assertSame(1, $share->fresh()->download_count);
    }

    public function test_partage_protege_par_mot_de_passe(): void
    {
        $share = $this->partager(['password' => 'secret1']);

        $this->getJson("/api/v1/public/shares/{$share->token}")
            ->assertJsonPath('data.requires_password', true);

        // Sans passer par le mot de passe, le téléchargement est refusé
        $this->get("/api/v1/public/shares/{$share->token}/download")->assertForbidden();

        $this->postJson("/api/v1/public/shares/{$share->token}/unlock", ['password' => 'mauvais'])
            ->assertForbidden();

        $lien = $this->postJson("/api/v1/public/shares/{$share->token}/unlock", ['password' => 'secret1'])
            ->assertOk()
            ->json('download_url');

        $this->get($lien)->assertOk();
    }

    public function test_partage_expire(): void
    {
        $share = $this->partager(['expires_at' => now()->addDay()->toDateTimeString()]);

        $this->travel(2)->days();

        $this->getJson("/api/v1/public/shares/{$share->token}")->assertStatus(410);
    }

    public function test_nombre_maximal_de_telechargements(): void
    {
        $share = $this->partager(['max_downloads' => 1]);

        $this->get("/api/v1/public/shares/{$share->token}/download")->assertOk();
        $this->get("/api/v1/public/shares/{$share->token}/download")->assertStatus(410);
    }

    public function test_partage_revoque(): void
    {
        $share = $this->partager();

        Sanctum::actingAs($this->admin());
        $this->deleteJson("/api/v1/shares/{$share->id}")->assertOk();
        $this->app['auth']->forgetGuards();

        $this->getJson("/api/v1/public/shares/{$share->token}")->assertStatus(410);
    }

    public function test_lien_inconnu(): void
    {
        $this->getJson('/api/v1/public/shares/inexistant')->assertNotFound();
    }

    public function test_la_consultation_ne_peut_pas_partager(): void
    {
        Sanctum::actingAs($this->consultation());

        $this->postJson("/api/v1/documents/{$this->document->id}/shares")->assertForbidden();
    }
}
