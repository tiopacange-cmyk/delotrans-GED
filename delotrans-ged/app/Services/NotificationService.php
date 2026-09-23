<?php

namespace App\Services;

use App\Models\DelotransNotification;
use App\Models\User;

class NotificationService
{
    public function notify(User $user, string $type, string $title, ?string $message = null, array $data = []): DelotransNotification
    {
        return DelotransNotification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);
    }

    public function notifyMany(iterable $users, string $type, string $title, ?string $message = null): void
    {
        foreach ($users as $user) {
            $this->notify($user, $type, $title, $message);
        }
    }
}
