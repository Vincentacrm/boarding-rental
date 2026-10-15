<?php

namespace App\Http\Controllers;

use App\Models\Inquiry;
use App\Models\Property;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->role;

        $isAdministrator = in_array($role, ['admin', 'superadmin'], true);

        $propertiesQuery = Property::query();
        $inquiriesQuery = Inquiry::query();

        if ($role === 'owner') {
            $propertiesQuery->where('user_id', $user->id);

            $inquiriesQuery->whereHas('property', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            });
        } elseif (!$isAdministrator) {
            $inquiriesQuery->where('user_id', $user->id);
        }

        $availableProperties = (clone $propertiesQuery)
            ->where('status', 'Available')
            ->count();

        $unavailableProperties = (clone $propertiesQuery)
            ->where('status', 'Unavailable')
            ->count();

        $totalInquiries = (clone $inquiriesQuery)->count();

        $pendingInquiries = (clone $inquiriesQuery)
            ->where('status', 'Pending')
            ->count();

        $approvedInquiries = (clone $inquiriesQuery)
            ->where('status', 'Approved')
            ->count();

        $completedInquiries = (clone $inquiriesQuery)
            ->where('status', 'Completed')
            ->count();

        $recentProperties = $propertiesQuery
            ->with('user')
            ->latest()
            ->take(5)
            ->get();

        $recentInquiries = $inquiriesQuery
            ->with(['property', 'user'])
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role,
            ],
            'stats' => [
                'total_properties' => (clone $propertiesQuery)->count(),
                'available_properties' => $availableProperties,
                'unavailable_properties' => $unavailableProperties,
                'total_inquiries' => $totalInquiries,
                'pending_inquiries' => $pendingInquiries,
                'approved_inquiries' => $approvedInquiries,
                'completed_inquiries' => $completedInquiries,
            ],
            'recent_properties' => $recentProperties,
            'recent_inquiries' => $recentInquiries,
        ]);
    }
}
