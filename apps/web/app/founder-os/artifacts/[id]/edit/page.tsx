import { Metadata } from 'next';
import ArtifactEditor from '@/components/founder-os/ArtifactEditor';

type Props = {
  params: { id: string };
  searchParams: { workspace?: string };
};

export const metadata: Metadata = {
  title: 'Edit Artifact - Founder OS',
  description: 'Edit artifact details',
};

export default function EditArtifactPage({ params, searchParams }: Props) {
  const workspaceSlug = searchParams.workspace || 'default';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ArtifactEditor artifactId={params.id} workspaceSlug={workspaceSlug} />
      </div>
    </div>
  );
}
