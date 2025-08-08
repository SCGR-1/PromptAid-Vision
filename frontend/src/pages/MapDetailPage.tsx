import { PageContainer, Button } from '@ifrc-go/ui';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface MapOut {
  image_id: string;
  file_key: string;
  image_url: string;
  source: string;
  type: string;
  epsg: string;
  image_type: string;
  caption?: {
    title: string;
    generated: string;
    edited?: string;
  };
}

export default function MapDetailPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const [map, setMap] = useState<MapOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contributing, setContributing] = useState(false);

  useEffect(() => {
    if (!mapId) {
      setError('Map ID is required');
      setLoading(false);
      return;
    }

    // Fetch the specific map
    fetch(`/api/images/${mapId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Map not found');
        }
        return response.json();
      })
      .then(data => {
        setMap(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [mapId]);

  const handleContribute = async () => {
    if (!map) return;
    
    setContributing(true);
    try {
      // Simulate uploading the current image by creating a new map entry
      const formData = new FormData();
      formData.append('source', map.source);
      formData.append('type', map.type);
      formData.append('epsg', map.epsg);
      formData.append('image_type', map.image_type);
      
      // We'll need to fetch the image and create a file from it
      const imageResponse = await fetch(map.image_url);
      const imageBlob = await imageResponse.blob();
      const file = new File([imageBlob], map.file_key, { type: 'image/jpeg' });
      formData.append('file', file);

      const response = await fetch('/api/images/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to contribute image');
      }

      const result = await response.json();
      
      // Navigate to the upload page with the new map ID and step 2
      navigate(`/upload?mapId=${result.image_id}&step=2`);
    } catch (err) {
      console.error('Contribution failed:', err);
      alert('Failed to contribute image. Please try again.');
    } finally {
      setContributing(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">Loading...</div>
        </div>
      </PageContainer>
    );
  }

  if (error || !map) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-red-500">{error || 'Map not found'}</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-4">
        <Button
          name="back"
          variant="secondary"
          onClick={() => navigate('/explore')}
          className="mb-4"
        >
          ← Back to Explore
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            {map.image_url ? (
              <img
                src={map.image_url}
                alt={map.file_key}
                className="w-full h-auto object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-full h-64 bg-gray-200 flex items-center justify-center text-gray-400">
                No image available
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Title</h3>
            <div className="space-y-2 text-sm">
              <div className="text-gray-700">
                {map.caption?.title || '— no title —'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Metadata</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-ifrcRed/10 text-ifrcRed text-sm rounded">
                {map.source}
              </span>
              <span className="px-3 py-1 bg-ifrcRed/10 text-ifrcRed text-sm rounded">
                {map.type}
              </span>
              <span className="px-3 py-1 bg-ifrcRed/10 text-ifrcRed text-sm rounded">
                {map.epsg}
              </span>
              <span className="px-3 py-1 bg-ifrcRed/10 text-ifrcRed text-sm rounded">
                {map.image_type}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Generated Caption</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                {map.caption?.edited || map.caption?.generated || '— no caption yet —'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contribute Section */}
      <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
        <Button
          name="contribute"
          onClick={handleContribute}
          disabled={contributing}
          className="bg-ifrcRed hover:bg-ifrcRed/90 text-white px-6 py-2 rounded-lg"
        >
          {contributing ? 'Contributing...' : 'Contribute'}
        </Button>
      </div>
    </PageContainer>
  );
} 