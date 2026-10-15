<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PropertyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $imageUrl = null;

        if ($this->image) {
            $imageUrl = filter_var($this->image, FILTER_VALIDATE_URL)
                ? $this->image
                : Storage::disk('public')->url($this->image);
        }

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'title' => $this->title,
            'type' => $this->type,
            'location' => $this->location,
            'price' => (float) $this->price,
            'description' => $this->description,
            'image' => $imageUrl,
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