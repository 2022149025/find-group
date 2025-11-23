import { NextRequest, NextResponse } from 'next/server';
import { ProfileService, ProfileInput } from '@/lib/services/profileService';

export async function POST(request: NextRequest) {
  try {
    const body: ProfileInput = await request.json();
    
    const profileService = new ProfileService();
    const profile = await profileService.createTemporaryProfile(body);

    return NextResponse.json({
      success: true,
      data: profile
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
