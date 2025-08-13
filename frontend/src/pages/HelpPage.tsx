import { PageContainer, Heading, Container } from '@ifrc-go/ui';

export default function HelpPage() {
  return (
    <PageContainer className="py-10">
      <Container withInternalPadding className="max-w-4xl mx-auto">
        <Heading level={2} className="text-center mb-12 text-gray-900">Help &amp; Support</Heading>
        
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
          </Container>

          <Container withInternalPadding className="p-8">
            <Heading level={3} className="mb-4 text-ifrcRed font-semibold">Guidelines</Heading>
            <p className="text-gray-700 leading-relaxed text-base">
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, 
              totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae 
              dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, 
              sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            </p>
          </Container>

          <Container withInternalPadding className="p-8">
            <Heading level={3} className="mb-4 text-ifrcRed font-semibold">VLMs</Heading>
            <p className="text-gray-700 leading-relaxed text-base">
              At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum 
              deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non 
              provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum 
              fuga. Et harum quidem rerum facilis est et expedita distinctio.
            </p>
          </Container>
        </div>
      </Container>
    </PageContainer>
  );
}
