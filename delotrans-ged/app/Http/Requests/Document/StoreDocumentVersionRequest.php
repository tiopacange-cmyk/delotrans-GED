<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('documents.version.create');
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:102400'],
            'comment' => ['nullable', 'string', 'max:255'],
        ];
    }
}
