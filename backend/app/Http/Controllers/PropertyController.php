<?php

namespace App\Http\Controllers;

use App\Http\Resources\PropertyResource;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PropertyController extends Controller
{
    public function index(Request $request)
    {
        $query = Property::with('user')
            ->where('status', 'Available');

        if ($request->filled('search')) {
            $search = $request->input('search');

            $query->where(function ($subquery) use ($search) {
                $subquery->where('title', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->input('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->input('max_price'));
        }

        $properties = $query
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return PropertyResource::collection($properties);
    }

    public function show(Property $property)
    {
        abort_unless(
            $property->status === 'Available',
            404,
            'Property not found.'
        );

        $property->load('user');

        return new PropertyResource($property);
    }

    public function store(Request $request)
    {
        abort_unless(
            in_array($request->user()->role, ['owner', 'admin'], true),
            403,
            'Only owners and administrators can create property listings.'
        );

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in([
                'Boarding House',
                'Apartment',
            ])],
            'location' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'description' => ['required', 'string'],
            'image' => ['nullable', 'string', 'max:2048'],
            'status' => ['sometimes', Rule::in([
                'Available',
                'Unavailable',
            ])],
        ]);

        $property = Property::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'status' => $validated['status'] ?? 'Available',
        ]);

        $property->load('user');

        return (new PropertyResource($property))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Property $property)
    {
        $this->authorizePropertyManagement($request, $property);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', Rule::in([
                'Boarding House',
                'Apartment',
            ])],
            'location' => ['sometimes', 'required', 'string', 'max:255'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:99999999.99'],
            'description' => ['sometimes', 'required', 'string'],
            'image' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'status' => ['sometimes', 'required', Rule::in([
                'Available',
                'Unavailable',
            ])],
        ]);

        $property->update($validated);
        $property->load('user');

        return new PropertyResource($property);
    }

    public function destroy(Request $request, Property $property)
    {
        $this->authorizePropertyManagement($request, $property);

        $property->delete();

        return response()->json([
            'message' => 'Property deleted successfully.',
        ]);
    }

    private function authorizePropertyManagement(
        Request $request,
        Property $property
    ): void {
        $user = $request->user();

        abort_unless(
            $user->role === 'admin' || $property->user_id === $user->id,
            403,
            'You are not allowed to manage this property.'
        );
    }
}