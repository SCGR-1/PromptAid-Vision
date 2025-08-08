import { TextOutput } from '@ifrc-go/ui';
import { useTranslation } from '@ifrc-go/ui/hooks';
import { resolveToComponent } from '@ifrc-go/ui/utils';

import SurgeCatalogueContainer from '#components/domain/SurgeCatalogueContainer';
import SurgeContentContainer from '#components/domain/SurgeContentContainer';
import Link from '#components/Link';

import i18n from './i18n.json';

/** @knipignore */
// eslint-disable-next-line import/prefer-default-export
export function Component() {
    const strings = useTranslation(i18n);

    return (
        <SurgeCatalogueContainer
            heading={strings.communityBasedTitle}
            goBackFallbackLink="surgeCatalogueHealth"
        >
            <SurgeContentContainer
                heading={strings.communityBasedCapacity}
            >
                <div>{strings.communityBasedDetail}</div>
            </SurgeContentContainer>
            <SurgeContentContainer
                heading={strings.communityBasedEmergencyServices}
            >
                <div>
                    {strings.communityBasedEmergencyDetailOne}
                    <br />
                    {strings.communityBasedEmergencyDetailTwo}
                </div>
            </SurgeContentContainer>
            <SurgeContentContainer
                heading={strings.communityBasedDesignedFor}
            >
                <div>{strings.communityBasedDesignedForDetail}</div>
            </SurgeContentContainer>
            <SurgeContentContainer
                heading={strings.communityBasedPersonnel}
            >
                <TextOutput
                    value={(
                        <ul>
                            <li>{strings.communityBasedPersonnelListItemOne}</li>
                            <li>{strings.communityBasedPersonnelListItemTwo}</li>
                        </ul>
                    )}
                    strongLabel
                />
                <div>
                    {strings.communityBasedPersonnelCompositionDescription}
                </div>
            </SurgeContentContainer>
            <SurgeContentContainer
                heading={strings.communityBasedStandardComponentsLabel}
            >
                <ul>
                    <li>{strings.communityBasedStandardComponentsListItemOne}</li>
                    <li>{strings.communityBasedStandardComponentsListItemTwo}</li>
                </ul>
            </SurgeContentContainer>
            <SurgeContentContainer
                heading={strings.communityBasedSpecificationsLabel}
            >
                <TextOutput
                    value={strings.communityBasedSpecificationsWeightValue}
                    label={strings.communityBasedSpecificationsWeightLabel}
                    strongLabel
                />
                <TextOutput
                    value={strings.communityBasedSpecificationsVolumeLabel}
                    label={strings.communityBasedSpecificationsVolumeValue}
                    strongLabel
                />
                <TextOutput
                    value={strings.communityBasedSpecificationsCostValue}
                    label={strings.communityBasedSpecificationsCostLabel}
                    strongLabel
                />
                <TextOutput
                    value={strings.communityBasedSpecificationsNationValue}
                    label={strings.communityBasedSpecificationsNationLabel}
                    strongLabel
                />
            </SurgeContentContainer>
            <SurgeContentContainer
                heading={strings.communityBasedAdditionalResources}
            >
                <ul>
                    <li>
                        {resolveToComponent(
                            strings.communityBasedAdditionalResourcesListItemOne,
                            {
                                link: (
                                    <Link
                                        href="https://rodekors.service-now.com/drm?id=hb_catalog&handbook=09f973a8db15f4103408d7b2f39619ee&category=31fefb60dbb938503408d7b2f3961958"
                                        external
                                        withLinkIcon
                                    >
                                        {strings.communityBasedAdditionalResourcesListItemOneLink}
                                    </Link>
                                ),
                            },
                        )}
                    </li>
                    <li>
                        {resolveToComponent(
                            strings.communityBasedAdditionalResourcesListItemTwo,
                            {
                                link: (
                                    <Link
                                        href="https://cbs.ifrc.org/"
                                        external
                                        withLinkIcon
                                    >
                                        {strings.communityBasedAdditionalResourcesListItemTwoLink}
                                    </Link>
                                ),
                            },
                        )}
                    </li>
                </ul>
            </SurgeContentContainer>
        </SurgeCatalogueContainer>
    );
}

Component.displayName = 'SurgeCatalogueHealthCommunityBasedSurveillance';
