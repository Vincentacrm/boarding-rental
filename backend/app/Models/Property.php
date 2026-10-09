<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Property extends Model
{
    protected $fillable = [
        'title',
        'type',
        'location',
        'price',
        'description',
        'image',
        'status'
    ];

    public function inquiries()
    {
        return $this->hasMany(Inquiry::class);
    }
}