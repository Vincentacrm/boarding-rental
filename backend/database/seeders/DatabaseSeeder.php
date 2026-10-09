<?php

namespace Database\Seeders;

use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Admin Owner',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Juan User',
            'email' => 'user@example.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
        ]);

        Property::create([
            'title' => 'Maria Boarding House',
            'type' => 'Boarding House',
            'location' => 'Virac, Catanduanes',
            'price' => 3500,
            'description' => 'Clean and affordable boarding house near schools and establishments.',
            'image' => null,
            'status' => 'Available',
        ]);

        Property::create([
            'title' => 'Sunrise Apartment',
            'type' => 'Apartment',
            'location' => 'Virac, Catanduanes',
            'price' => 8000,
            'description' => 'Comfortable apartment suitable for students or small families.',
            'image' => null,
            'status' => 'Available',
        ]);

        Property::create([
            'title' => 'Student Room',
            'type' => 'Room',
            'location' => 'San Roque, Virac',
            'price' => 2500,
            'description' => 'Simple and affordable room for students.',
            'image' => null,
            'status' => 'Available',
        ]);
    }
}