<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->foreignId('folder_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('mime_type', 150);
            $table->unsignedBigInteger('file_size');
            $table->string('nas_path', 500); // chemin du fichier sur le NAS monté
            $table->enum('status', ['draft', 'published', 'archived'])->default('published');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('folder_id');
            $table->index('client_id');
            $table->index('category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
