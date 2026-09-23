<?php

namespace App\Http\Requests\Folder;

use Illuminate\Foundation\Http\FormRequest;

class MoveFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('folders.move');
    }

    public function rules(): array
    {
        return [
            'parent_id' => ['nullable', 'exists:folders,id'],
        ];
    }
}
