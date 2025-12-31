import { Metadata } from 'next';
import ArtifactEditor from '@/components/founder-os/ArtifactEditor';

type Props = {
  searchParams: { workspace?: string };
};

export const metadata: Metadata = {
  title: 'Create Artifact - Founder OS',
  description: 'Create a new artifact',
};

export default function NewArtifactPage({ searchParams }: Props) {
  const workspaceSlug = searchParams.workspace || 'default';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ArtifactEditor workspaceSlug={workspaceSlug} />
      </div>
    </div>
  );
}
