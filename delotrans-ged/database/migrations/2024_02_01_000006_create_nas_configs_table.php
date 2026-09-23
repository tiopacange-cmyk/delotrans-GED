<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nas_configs', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->enum('driver', ['synology', 'qnap', 'truenas']);
            $table->string('host', 255);
            $table->unsignedInteger('port');
            $table->enum('protocol', ['smb', 'nfs', 'webdav', 'ftp']);
            $table->string('username', 150);
            $table->text('credentials_encrypted');
            $table->string('base_path', 500);
            $table->boolean('is_active')->default(true);
            $table->enum('status', ['online', 'offline', 'error'])->default('offline');
            $table->unsignedBigInteger('total_space_bytes')->nullable();
            $table->unsignedBigInteger('used_space_bytes')->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nas_configs');
    }
};
