import { useTranslation } from '@ifrc-go/ui/hooks';

import Page from '#components/Page';

import i18n from './i18n.json';
import styles from './styles.module.css';

/** @knipignore */
// eslint-disable-next-line import/prefer-default-export
export function Component() {
    const strings = useTranslation(i18n);

    return (
        <Page
            className={styles.globalThreeW}
            title={strings.pageTitle}
            heading={strings.pageHeading}
            description={strings.pageDescription}
            mainSectionClassName={styles.mainSection}
        >
            <iframe
                title={strings.pageTitle}
                className={styles.ppIframe}
                src="https://public.tableau.com/views/PPPdashboard_16805965348010/1_Overview?:showVizHome=no&:embed=true&:language=en-US&:origin=viz_share_link&:display_count=no&:toolbar=yes"
            />
        </Page>
    );
}

Component.displayName = 'GlobalThreeW';
