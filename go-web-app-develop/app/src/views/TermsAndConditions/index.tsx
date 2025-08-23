import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Container,
    NavigationTabList,
} from '@ifrc-go/ui';
import {
    useBooleanState,
    useTranslation,
} from '@ifrc-go/ui/hooks';
import { resolveToComponent } from '@ifrc-go/ui/utils';
import { isFalsyString } from '@togglecorp/fujs';

import Link from '#components/Link';
import NavigationTab from '#components/NavigationTab';
import Page from '#components/Page';
import useAuth from '#hooks/domain/useAuth';

import ConditionsModal from './ConditionsModal';

import i18n from './i18n.json';
import styles from './styles.module.css';

const sectionUrlHash = {
    dataProvenance: 'data-provenance',
    userRegistration: 'user-registration',
    unauthorizedUses: 'unauthorised-uses',
    complianceOfUserOwner: 'compliance-of-user-owner',
    liabilityOfIfrc: 'liability-of-ifrc',
    protectionPersonalData: 'protection-personal-data',
    privilegesAndImmunities: 'privileges-and-immunities',
    finalProvisions: 'final-provisions',
};

/** @knipignore */
// eslint-disable-next-line import/prefer-default-export
export function Component() {
    const strings = useTranslation(i18n);
    const { isAuthenticated } = useAuth();

    const { hash: locationHash } = useLocation();

    const [showHereConditionModal, {
        setTrue: setShowHereModalTrue,
        setFalse: setShowHereModalFalse,
    }] = useBooleanState(false);

    useEffect(() => {
        if (isFalsyString(locationHash)) {
            return;
        }

        const element = document.getElementById(locationHash.substring(1));
        if (element) {
            element.scrollIntoView({
                block: 'start',
                behavior: 'smooth',
            });
        }
    }, [locationHash]);

    return (
        <Page
            heading={strings.termsAndConditionTitle}
            className={styles.termsAndConditions}
            mainSectionClassName={styles.mainSection}
        >
            <div className={styles.sidebar}>
                <NavigationTabList
                    className={styles.tabList}
                    variant="vertical"
                >
                    <NavigationTab
                        to="termsAndConditions"
                        urlHash={sectionUrlHash.dataProvenance}
                    >
                        {strings.dataProvenanceHeading}
                    </NavigationTab>
                    <NavigationTab
                        to="termsAndConditions"
                        urlHash={sectionUrlHash.userRegistration}
                    >
                        {strings.userRegistrationHeading}
                    </NavigationTab>
                    <NavigationTab
                        to="termsAndConditions"
                        urlHash={sectionUrlHash.unauthorizedUses}
                    >
                        {strings.unAuthorisedUsesHeading }
                    </NavigationTab>
                    <NavigationTab
                        to="termsAndConditions"
                        urlHash={sectionUrlHash.complianceOfUserOwner}
                    >
                        {strings.complianceDateOwnerHeading}
                    </NavigationTab>
                    <NavigationTab
                        to="termsAndConditions"
                        urlHash={sectionUrlHash.liabilityOfIfrc}
                    >
                        {strings.liabilityOfIFRCHeading }
                    </NavigationTab>
                    <NavigationTab
                        to="termsAndConditions"
                        urlHash={sectionUrlHash.protectionPersonalData}
                    >
                        {strings.protectionUsersPersonalDataHeading}
                    </NavigationTab>
                    <NavigationTab
                        to="termsAndConditions"
                        urlHash={sectionUrlHash.privilegesAndImmunities}
                    >
                        {strings.privilegesAndImmunitiesHeading}
                    </NavigationTab>
                    <NavigationTab
                        to="termsAndConditions"
                        urlHash={sectionUrlHash.finalProvisions}
                    >
                        {strings.finalProvisionsHeading}
                    </NavigationTab>
                </NavigationTabList>
            </div>
            <Container
                className={styles.content}
                contentViewType="vertical"
                spacing="relaxed"
            >
                <Container
                    contentViewType="vertical"
                >
                    <div>{strings.termsAndConditionsDescription1}</div>
                    <div>{strings.termsAndConditionsDescription2}</div>
                    <div>{strings.termsAndConditionsDescription3}</div>
                </Container>
                <Container
                    heading={strings.dataProvenanceHeading}
                    withHeaderBorder
                    elementId={sectionUrlHash.dataProvenance}
                >
                    {strings.dataProvenanceDescription}
                </Container>
                <Container
                    heading={strings.userRegistrationHeading}
                    withHeaderBorder
                    elementId={sectionUrlHash.userRegistration}
                    contentViewType="vertical"
                >
                    <div>{strings.userRegistrationDescription}</div>
                    {!isAuthenticated && (
                        <div>
                            {resolveToComponent(
                                strings.userRegistrationDescriptionToLink,
                                {
                                    registerLink: (
                                        <Link
                                            to="register"
                                            withUnderline
                                        >
                                            {strings.userRegistrationDescriptionLink}
                                        </Link>
                                    ),
                                },
                            )}
                        </div>
                    )}
                    <div>
                        {strings.userRegistrationAuthorizedUser}
                    </div>
                    <div>{strings.userRegistrationDescriptionByRegistering}</div>
                    <ul>
                        <li>
                            {strings.userRegistrationDescriptionList1}
                        </li>
                        <li>
                            {strings.userRegistrationDescriptionList2}
                            <ul>
                                <li>
                                    {strings.userRegistrationDescriptionList}
                                    <div>
                                        { resolveToComponent(
                                            strings.userRegistrationByLink,
                                            {
                                                termsLink: (
                                                    <Link
                                                        href="https://monty-api.ifrc.org/__docs__/"
                                                        withUnderline
                                                        external
                                                    >
                                                        https://monty-api.ifrc.org/__docs__/
                                                    </Link>
                                                ),
                                            },
                                        )}
                                    </div>
                                </li>
                            </ul>
                        </li>
                        <li>{strings.userRegistrationDescriptionList3}</li>
                        <li>{strings.userRegistrationDescriptionList4}</li>
                    </ul>
                    <div>{strings.userRegistrationDescription5}</div>
                </Container>
                <Container
                    heading={strings.unAuthorisedUsesHeading}
                    withHeaderBorder
                    elementId={sectionUrlHash.unauthorizedUses}
                    contentViewType="vertical"
                >
                    <p>{strings.unAuthorisedUsesDescription}</p>
                    <ul>
                        <li>{strings.unAuthorisedUsesDescriptionList1}</li>
                        <li>{strings.unAuthorisedUsesDescriptionList2}</li>
                        <li>{strings.unAuthorisedUsesDescriptionList3}</li>
                        <li>{strings.unAuthorisedUsesDescriptionList4}</li>
                        <li>{strings.unAuthorisedUsesDescriptionList5}</li>
                        <li>{strings.unAuthorisedUsesDescriptionList6}</li>
                        <li>{strings.unAuthorisedUsesDescriptionList7}</li>
                        <li>{strings.unAuthorisedUsesDescriptionList8}</li>
                        <li>{strings.unAuthorisedUsesDescriptionList9}</li>
                        <li>{strings.unAuthorisedUsesDescriptionList10}</li>
                    </ul>
                    <p>{strings.unAuthorisedUsesDescription2}</p>
                    <p>{strings.unAuthorisedUsesDescription3}</p>
                </Container>
                <Container
                    heading={strings.complianceDateOwnerHeading}
                    withHeaderBorder
                    elementId={sectionUrlHash.complianceOfUserOwner}
                    contentViewType="vertical"
                >
                    <p>{strings.complianceDateOwnerDescription1}</p>
                    <div>
                        {resolveToComponent(
                            strings.complianceDateOwnerDescription2,
                            {
                                termsLink: (
                                    <Link
                                        to="termsAndConditions"
                                        withUnderline
                                        onClick={setShowHereModalTrue}
                                    >
                                        {strings.complianceDateOwnerDescription2Link}
                                    </Link>
                                ),
                            },
                        )}
                        {showHereConditionModal && (
                            <ConditionsModal onClose={setShowHereModalFalse} />
                        )}
                    </div>
                    <div>
                        {resolveToComponent(
                            strings.complianceDateOwnerDescription3,
                            {
                                termsLink: (
                                    <Link
                                        href="mailto:IM@ifrc.org"
                                        withUnderline
                                        external
                                    >
                                        IM@ifrc.org
                                    </Link>
                                ),
                            },
                        )}
                    </div>
                    <p>{strings.complianceDateOwnerDescription4}</p>
                    <p>{strings.complianceDateOwnerDescription5}</p>
                </Container>
                <Container
                    heading={strings.liabilityOfIFRCHeading}
                    withHeaderBorder
                    elementId={sectionUrlHash.liabilityOfIfrc}
                    contentViewType="vertical"
                >
                    <p>{strings.liabilityOfIFRCDescription}</p>
                    <ul>
                        <li>{strings.liabilityOfIFRCDescriptionList1}</li>
                        <li>{strings.liabilityOfIFRCDescriptionList2}</li>
                        <li>
                            { resolveToComponent(
                                strings.liabilityOfIFRCDescriptionList3,
                                {
                                    termsLink: (
                                        <Link
                                            external
                                            href="https://www.go-fair.org/fair-principles/"
                                        >
                                            {strings.liabilityOfIFRCDescription3Link}

                                        </Link>
                                    ),
                                },
                            )}
                        </li>
                        <li>{strings.liabilityOfIFRCDescriptionList4}</li>
                        <li>{strings.liabilityOfIFRCDescriptionList5}</li>
                    </ul>
                    <p>{strings.liabilityOfIFRCDescription2}</p>
                    <p>{strings.liabilityOfIFRCDescription3}</p>
                    <p>{strings.liabilityOfIFRCDescription4}</p>
                    <p>{strings.liabilityOfIFRCDescription5}</p>
                </Container>
                <Container
                    heading={strings.protectionUsersPersonalDataHeading}
                    withHeaderBorder
                    elementId={sectionUrlHash.protectionPersonalData}
                    contentViewType="vertical"
                >
                    <p>{strings.protectionUsersPersonalDataDescription}</p>
                    <ul>
                        <li>{strings.protectionUsersPersonalDataDescriptionList1}</li>
                        <li>{strings.protectionUsersPersonalDataDescriptionList2}</li>
                        <li>{strings.protectionUsersPersonalDataDescriptionList3}</li>
                        <li>{strings.protectionUsersPersonalDataDescriptionList4}</li>
                    </ul>
                    <div>
                        {resolveToComponent(
                            strings.protectionUsersPersonalDataDescription2,
                            {
                                termsLink: (
                                    <Link
                                        href="mailto:IM@ifrc.org"
                                        external
                                        withUnderline

                                    >
                                        IM@ifrc.org
                                    </Link>
                                ),
                            },
                        )}
                    </div>
                    <div>
                        {resolveToComponent(
                            strings.protectionUsersPersonalDataDescription3,
                            {
                                termsLink: (
                                    <Link
                                        external
                                        href="https://www.ifrc.org/document/IFRC-Data-Protection-Policy"
                                    >
                                        {strings.protectionUsersPersonalDataLink3}

                                    </Link>
                                ),
                            },
                        )}
                    </div>
                    <p>{strings.protectionUsersPersonalDataDescription4}</p>
                    <div>
                        {resolveToComponent(
                            strings.protectionUsersPersonalDataDescription5,
                            {
                                termsLink: (
                                    <Link
                                        href="mailto:IM@ifrc.org"
                                        external
                                        withUnderline

                                    >
                                        IM@ifrc.org
                                    </Link>
                                ),
                            },
                        )}
                    </div>
                </Container>
                <Container
                    heading={strings.privilegesAndImmunitiesHeading}
                    withHeaderBorder
                    elementId={sectionUrlHash.privilegesAndImmunities}
                    contentViewType="vertical"
                >
                    {strings.privilegesAndImmunitiesDescription}
                </Container>
                <Container
                    heading={strings.finalProvisionsHeading}
                    withHeaderBorder
                    elementId={sectionUrlHash.finalProvisions}
                    contentViewType="vertical"
                >
                    <p>{strings.finalProvisionsDescription1}</p>
                    <p>{strings.finalProvisionsDescription2}</p>
                    <div>
                        {resolveToComponent(
                            strings.finalProvisionsDescription3,
                            {
                                termsLink: (
                                    <Link
                                        external
                                        href="mailto:IM@ifrc.org"
                                        withUnderline
                                    >
                                        IM@ifrc.org
                                    </Link>
                                ),
                            },
                        )}
                    </div>
                    <p>{strings.finalProvisionsDescription4}</p>
                </Container>
            </Container>
        </Page>
    );
}
Component.displayName = 'TermsAndConditions';
