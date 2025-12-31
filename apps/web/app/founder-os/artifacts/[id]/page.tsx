import { Metadata } from 'next';
import ArtifactViewer from '@/components/founder-os/ArtifactViewer';

type Props = {
  params: { id: string };
};

export const metadata: Metadata = {
  title: 'View Artifact - Founder OS',
  description: 'View artifact details',
};

export default function ArtifactPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ArtifactViewer artifactId={params.id} />
      </div>
    </div>
  );
}
