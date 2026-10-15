<?php

namespace App\Http\Controllers;

use App\Models\Inquiry;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InquiryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Inquiry::with(['property', 'user']);

        if ($user->role === 'admin') {
            // Administrators can view all inquiries.
        } elseif ($user->role === 'owner') {
            $query->whereHas('property', function ($propertyQuery) use ($user) {
                $propertyQuery->where('user_id', $user->id);
            });
        } else {
            $query->where('user_id', $user->id);
        }

        return response()->json([
            'data' => $query->latest()->paginate(10),
        ]);
    }

    public function show(Request $request, Inquiry $inquiry)
    {
        $this->authorizeInquiryAccess($request, $inquiry);

        $inquiry->load(['property', 'user']);

        return response()->json([
            'data' => $inquiry,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'property_id' => [
                'required',
                'integer',
                'exists:properties,id',
            ],
            'message' => [
                'required',
                'string',
                'min:10',
                'max:2000',
            ],
        ]);

        $property = Property::findOrFail($validated['property_id']);

        abort_unless(
            $property->status === 'Available',
            422,
            'This property is currently unavailable.'
        );

        $inquiry = Inquiry::create([
            'user_id' => $request->user()->id,
            'property_id' => $property->id,
            'message' => $validated['message'],
            'status' => 'Pending',
        ]);

        $inquiry->load(['property', 'user']);

        return response()->json([
            'message' => 'Rental inquiry submitted successfully.',
            'data' => $inquiry,
        ], 201);
    }

    public function update(Request $request, Inquiry $inquiry)
    {
        $user = $request->user();

        abort_unless(
            $user->role === 'admin'
                || (
                    $user->role === 'owner'
                    && $inquiry->property
                    && $inquiry->property->user_id === $user->id
                ),
            403,
            'You are not allowed to update this inquiry.'
        );

        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['Pending', 'Approved', 'Completed']),
            ],
        ]);

        $inquiry->update($validated);
        $inquiry->load(['property', 'user']);

        return response()->json([
            'message' => 'Inquiry status updated successfully.',
            'data' => $inquiry,
        ]);
    }

    public function destroy(Request $request, Inquiry $inquiry)
    {
        $user = $request->user();

        // Customers can delete their own inquiries.
        // Administrators can delete any inquiry.
        abort_unless(
            $user->role === 'admin'
                || $inquiry->user_id === $user->id,
            403,
            'You are not allowed to delete this inquiry.'
        );

        $inquiry->delete();

        return response()->json([
            'message' => 'Inquiry deleted successfully.',
        ]);
    }

    private function authorizeInquiryAccess(
        Request $request,
        Inquiry $inquiry
    ): void {
        $user = $request->user();

        $isOwnerOfProperty = $user->role === 'owner'
            && $inquiry->property
            && $inquiry->property->user_id === $user->id;

        abort_unless(
            $user->role === 'admin'
                || $inquiry->user_id === $user->id
                || $isOwnerOfProperty,
            403,
            'You are not allowed to access this inquiry.'
        );
    }
}