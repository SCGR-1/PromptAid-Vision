import { Container } from '@ifrc-go/ui';
import { useTranslation } from '@ifrc-go/ui/hooks';
import { _cs } from '@togglecorp/fujs';

import Page from '#components/Page';

import i18n from './i18n.json';
import styles from './styles.module.css';

interface Props {
    className?: string;
    variant?: 'page' | 'component';
}

function ThreeWDecommissionMessage(props: Props) {
    const {
        className,
        variant = 'component',
    } = props;

    const strings = useTranslation(i18n);

    if (variant === 'page') {
        return (
            <Page
                title={strings.title}
                heading={strings.pageHeading}
                mainSectionClassName={styles.threeWDecommissionPage}
            >
                {strings.description}
                <Container
                    heading={strings.rationaleHeading}
                    headingLevel={4}
                    spacing="condensed"
                >
                    {strings.rationale}
                </Container>
            </Page>
        );
    }

    return (
        <Container
            className={_cs(className, styles.threeWDecommissionMessage)}
            heading={strings.heading}
            contentViewType="vertical"
            withHeaderBorder
        >
            {strings.description}
            <Container
                heading={strings.rationaleHeading}
                headingLevel={4}
                spacing="condensed"
            >
                {strings.rationale}
            </Container>
        </Container>
    );
}

export default ThreeWDecommissionMessage;
