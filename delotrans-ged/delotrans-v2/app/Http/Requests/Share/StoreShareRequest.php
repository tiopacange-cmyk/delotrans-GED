<?php

namespace App\Http\Requests\Share;

use Illuminate\Foundation\Http\FormRequest;

class StoreShareRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('shares.create');
    }

    public function rules(): array
    {
        return [
            'password' => ['nullable', 'string', 'min:4'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'max_downloads' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
