import {
    Button,
    Container,
    Modal,
    TextOutput,
} from '@ifrc-go/ui';
import {
    useBooleanState,
    useTranslation,
} from '@ifrc-go/ui/hooks';
import { _cs } from '@togglecorp/fujs';

import { joinStrings } from '#utils/common';
import { type GoApiResponse } from '#utils/restRequest';

import ReadinessIcon from '../ReadinessIcon';

import i18n from './i18n.json';
import styles from './styles.module.css';

type GetEruReadinessResponse = GoApiResponse<'/api/v2/eru-readiness/'>;
type EruReadinessListItem = NonNullable<GetEruReadinessResponse['results']>[number];

interface Props {
    className?: string;
    eruData: EruReadinessListItem;
}

function NationalSocietyTypeCard(props: Props) {
    const {
        className,
        eruData,
    } = props;

    const strings = useTranslation(i18n);

    const [
        showReadinessInfo,
        {
            setTrue: setShowReadinessInfoTrue,
            setFalse: setShowReadinessInfoFalse,
        },
    ] = useBooleanState(false);

    const eruTypes = joinStrings(eruData.eru_types.map((eruType) => eruType.type_display));

    return (
        <Container
            className={_cs(styles.nationalSocietyTypeCard, className)}
            withInternalPadding
            withHeaderBorder
            withFooterBorder
            heading={eruData?.eru_owner_details?.national_society_country_details?.society_name ?? '??'}
            headerDescription={(
                <TextOutput
                    label={strings.emergencyResponseUnitOwnerNSCardLastUpdated}
                    value={eruData.updated_at}
                    valueType="date"
                />
            )}
            footerActions={(
                <Button
                    name={undefined}
                    onClick={setShowReadinessInfoTrue}
                    variant="tertiary"
                    title={strings.eruNSSeeReadinessInfoButton}
                >
                    {strings.eruNSSeeReadinessInfoButton}
                </Button>
            )}
        >
            <TextOutput
                label={strings.eruTypesLabel}
                value={eruTypes}
                strongValue
            />
            {showReadinessInfo && (
                <Modal
                    className={styles.modal}
                    heading={
                        eruData.eru_owner_details.national_society_country_details.society_name
                    }
                    headerDescription={strings.eruNSReadinessInformationHeading}
                    onClose={setShowReadinessInfoFalse}
                    withHeaderBorder
                    size="md"
                    contentViewType="vertical"
                    spacing="comfortable"
                >
                    {eruData.eru_types.map((eruType) => (
                        <Container
                            key={eruType.id}
                            heading={eruType.type_display}
                            headingLevel={5}
                            withHeaderBorder
                            childrenContainerClassName={styles.readinessContainer}
                            spacing="compact"
                        >
                            <ReadinessIcon
                                readinessType={eruType.equipment_readiness}
                                label={strings.eruNSEquipmentReadiness}
                            />
                            <div className={styles.verticalSeparator} />
                            <ReadinessIcon
                                readinessType={eruType.people_readiness}
                                label={strings.eruNSPeopleReadiness}
                            />
                            <div className={styles.separatorLeft} />
                            <ReadinessIcon
                                readinessType={eruType.funding_readiness}
                                label={strings.eruNSFundingReadiness}
                            />
                            <div className={styles.separator} />
                        </Container>
                    ))}
                </Modal>
            )}
        </Container>
    );
}

export default NationalSocietyTypeCard;
