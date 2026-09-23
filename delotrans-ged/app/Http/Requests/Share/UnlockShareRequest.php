<?php

namespace App\Http\Requests\Share;

use Illuminate\Foundation\Http\FormRequest;

class UnlockShareRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'password' => ['required', 'string'],
        ];
    }
}
