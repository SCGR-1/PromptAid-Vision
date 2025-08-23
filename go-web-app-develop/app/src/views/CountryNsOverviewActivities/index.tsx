import { Container } from '@ifrc-go/ui';

import WikiLink from '#components/WikiLink';

import NationalSocietyDevelopmentInitiatives from './NationalSocietyDevelopmentInitiatives';

/** @knipignore */
// eslint-disable-next-line import/prefer-default-export
export function Component() {
    return (
        <Container
            actions={(
                <WikiLink
                    href="user_guide/Country_Pages#national-society-overview"
                />
            )}
            withCenteredHeaderDescription
            contentViewType="vertical"
            spacing="loose"
        >
            <NationalSocietyDevelopmentInitiatives />
        </Container>
    );
}

Component.displayName = 'CountryNsOverviewActivities';
