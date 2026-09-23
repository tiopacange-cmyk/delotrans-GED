<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('documents.create');
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:102400', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,zip'],
            'name' => ['nullable', 'string', 'max:255'],
            'folder_id' => ['required', 'exists:folders,id'],
            'client_id' => ['nullable', 'exists:clients,id'],
            'category_id' => ['nullable', 'exists:categories,id'],
        ];
    }
}
