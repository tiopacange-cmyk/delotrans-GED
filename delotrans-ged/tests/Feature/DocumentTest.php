<?php

namespace Tests\Feature;

use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DocumentTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private const PDF = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n";

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('nas');
        Sanctum::actingAs($this->admin());
    }

    private function dossier(): int
    {
        $clientId = $this->postJson('/api/v1/clients', ['code' => 'CLI001', 'name' => 'Client Test'])
            ->assertCreated()->json('data.id');

        return $this->postJson('/api/v1/folders', ['name' => 'Dossier 2026', 'client_id' => $clientId])
            ->assertCreated()->json('data.id');
    }

    private function deposer(int $folderId, string $nom = 'contrat.pdf'): Document
    {
        $id = $this->post('/api/v1/documents', [
            'file' => UploadedFile::fake()->createWithContent($nom, self::PDF),
            'folder_id' => $folderId,
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

        return Document::findOrFail($id);
    }

    public function test_depot_d_un_document(): void
    {
        $document = $this->deposer($this->dossier());

        $this->assertSame('contrat.pdf', $document->name);
        $this->assertSame('application/pdf', $document->mime_type);
        Storage::disk('nas')->assertExists($document->nas_path);

        // Le fichier d'origine devient la version 1
        $this->getJson("/api/v1/documents/{$document->id}/versions")
            ->assertOk()
            ->assertJsonPath('data.0.version_number', 1);
    }

    public function test_un_type_de_fichier_interdit_est_refuse(): void
    {
        $this->post('/api/v1/documents', [
            'file' => UploadedFile::fake()->createWithContent('script.php', '<?php echo 1;'),
            'folder_id' => $this->dossier(),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_le_telechargement_rend_le_fichier_d_origine(): void
    {
        $document = $this->deposer($this->dossier());

        $reponse = $this->get("/api/v1/documents/{$document->id}/download")->assertOk();

        $this->assertSame(self::PDF, $reponse->streamedContent());
    }

    public function test_apercu_et_recherche(): void
    {
        $document = $this->deposer($this->dossier(), 'facture-mars.pdf');

        $this->get("/api/v1/documents/{$document->id}/preview")->assertOk();

        $this->getJson('/api/v1/search/documents?q=facture')
            ->assertOk()
            ->assertJsonFragment(['id' => $document->id]);
    }

    public function test_ajout_d_une_nouvelle_version(): void
    {
        $document = $this->deposer($this->dossier());

        $this->post("/api/v1/documents/{$document->id}/versions", [
            'file' => UploadedFile::fake()->createWithContent('contrat-v2.pdf', self::PDF.'% v2'),
            'comment' => 'Signature client',
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->assertSame(2, $document->versions()->count());
    }

    public function test_suppression_vers_la_corbeille(): void
    {
        $document = $this->deposer($this->dossier());

        $this->deleteJson("/api/v1/documents/{$document->id}")->assertOk();

        $this->assertSoftDeleted($document);
    }

    public function test_la_consultation_telecharge_mais_ne_depose_ni_ne_supprime(): void
    {
        $folderId = $this->dossier();
        $document = $this->deposer($folderId);

        Sanctum::actingAs($this->consultation());

        $this->get("/api/v1/documents/{$document->id}/download")->assertOk();
        $this->post('/api/v1/documents', [
            'file' => UploadedFile::fake()->createWithContent('autre.pdf', self::PDF),
            'folder_id' => $folderId,
        ], ['Accept' => 'application/json'])->assertForbidden();
        $this->deleteJson("/api/v1/documents/{$document->id}")->assertForbidden();
    }

    public function test_les_actions_sont_tracees_dans_le_journal(): void
    {
        $this->deposer($this->dossier());

        $this->getJson('/api/v1/logs')->assertOk();
        $this->assertDatabaseHas('activity_logs', ['user_id' => $this->admin()->id]);
    }
}
