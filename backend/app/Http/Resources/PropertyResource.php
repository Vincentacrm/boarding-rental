<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PropertyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'title' => $this->title,
            'type' => $this->type,
            'location' => $this->location,
            'price' => (float) $this->price,
            'description' => $this->description,
            'image' => $this->image,
            'status' => $this->status,
            'owner' => $this->whenLoaded('user', function () {
    if (!$this->user) {
        return null;
    }

    return [
        'id' => $this->user->id,
        'name' => $this->user->name,
    ];
}),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}