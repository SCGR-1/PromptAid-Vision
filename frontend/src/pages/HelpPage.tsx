import { PageContainer, Heading, Container, Button } from '@ifrc-go/ui';
import { useNavigate } from 'react-router-dom';
import { useFilterContext } from '../contexts/FilterContext';

export default function HelpPage() {
  const navigate = useNavigate();
  const { setShowReferenceExamples } = useFilterContext();

  const handleUploadNow = () => {
    navigate('/upload');
  };

  const handleSeeExamples = () => {
    setShowReferenceExamples(true);
    navigate('/explore');
  };

  const handleViewVlmDetails = () => {
    navigate('/analytics?view=crisis_maps');
  };

  return (
    <PageContainer className="py-10">
      <Container withInternalPadding className="max-w-4xl mx-auto">

        
        <div className="space-y-8">
          <Container withInternalPadding className="p-8">
            <Heading level={3} className="mb-4 text-ifrcRed font-semibold">Introduction</Heading>
            <p className="text-gray-700 leading-relaxed text-base">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore 
              et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut 
              aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse 
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
              culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <div className="mt-6">
              <Button
                name="upload-now"
                variant="primary"
                onClick={handleUploadNow}
              >
                Upload now →
              </Button>
            </div>
          </Container>

          <Container withInternalPadding className="p-8">
            <Heading level={3} className="mb-4 text-ifrcRed font-semibold">Guidelines</Heading>
            <p className="text-gray-700 leading-relaxed text-base">
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, 
              totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae 
              dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, 
              sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            </p>
            <div className="mt-6">
              <Button
                name="see-examples"
                variant="primary"
                onClick={handleSeeExamples}
              >
                See examples →
              </Button>
            </div>
          </Container>

          <Container withInternalPadding className="p-8">
            <Heading level={3} className="mb-4 text-ifrcRed font-semibold">VLMs</Heading>
            <p className="text-gray-700 leading-relaxed text-base">
              At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum 
              deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non 
              provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum 
              fuga. Et harum quidem rerum facilis est et expedita distinctio.
            </p>
            <div className="mt-6">
              <Button
                name="view-vlm-details"
                variant="primary"
                onClick={handleViewVlmDetails}
              >
                View VLM details →
              </Button>
            </div>
          </Container>
        </div>
      </Container>
    </PageContainer>
  );
}
