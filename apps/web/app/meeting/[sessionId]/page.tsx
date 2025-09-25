import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import VirtualMeetingRoom from '../../../components/ux-enhanced/VirtualMeetingRoom';
import MeetingRoomProvider from '../../../components/meeting/MeetingRoomProvider';

interface PageProps {
  params: {
    sessionId: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Meeting Room - Session ${params.sessionId}`,
    description: 'BeBrahma Virtual Meeting Room with real-time AI agents',
    keywords: 'AI, meeting room, collaboration, real-time, agents'
  };
}

export default async function MeetingRoomPage({ params }: PageProps) {
  const { sessionId } = params;
  
  // Validate sessionId format (basic validation)
  if (!sessionId || sessionId.length < 3) {
    notFound();
  }
  
  // Check if user is authenticated
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
  const user = isAuthDisabled ? null : await currentUser();
  if (!isAuthDisabled && !user) {
    redirect('/sign-in?redirect_url=' + encodeURIComponent(`/meeting/${sessionId}`));
  }
  
  // Fetch initial session data if needed
  let sessionData = null;
  try {
    // In a real app, you might want to validate the session exists
    // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionId}`, {
    //   headers: {
    //     'Authorization': `Bearer ${await user.getToken()}`
    //   }
    // });
    // 
    // if (!response.ok) {
    //   notFound();
    // }
    // 
    // sessionData = await response.json();
  } catch (error) {
    console.error('Error fetching session data:', error);
    // Continue with default session data
  }

  return (
    <div className="min-h-screen">
      <MeetingRoomProvider sessionId={sessionId}>
        <VirtualMeetingRoom 
          sessionId={sessionId}
          currentStage={sessionData?.currentStage || 'collaboration'}
        />
      </MeetingRoomProvider>
    </div>
  );
}

// Generate static params for common session patterns (optional)
export async function generateStaticParams() {
  // This could be used to pre-generate common session IDs
  // For now, we'll use dynamic generation
  return [];
}

// Configure page to be dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;