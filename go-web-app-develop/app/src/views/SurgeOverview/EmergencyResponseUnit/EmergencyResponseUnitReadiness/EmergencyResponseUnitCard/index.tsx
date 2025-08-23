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

import { type GoApiResponse } from '#utils/restRequest';

import ReadinessIcon from '../ReadinessIcon';

import i18n from './i18n.json';
import styles from './styles.module.css';

type GetEruReadinessResponse = GoApiResponse<'/api/v2/eru-readiness-type/'>;

export type ReadinessList = Array<NonNullable<NonNullable<GetEruReadinessResponse['results']>[0]> & {
    eruOwner: NonNullable<NonNullable<NonNullable<GetEruReadinessResponse['results']>[0]>['eru_readiness']>[0]['eru_owner_details'];
    updatedAt: NonNullable<NonNullable<NonNullable<GetEruReadinessResponse['results']>[0]>['eru_readiness']>[0]['updated_at'];
}>

interface Props {
    className?: string;
    typeDisplay: string;
    nationalSocieties: string;
    fundingReadiness: number | undefined;
    equipmentReadiness: number | undefined;
    peopleReadiness: number | undefined;
    updatedAt: number | undefined;
    readinessList: ReadinessList;
}

function EmergencyResponseUnitTypeCard(props: Props) {
    const {
        className,
        typeDisplay,
        nationalSocieties,
        fundingReadiness,
        equipmentReadiness,
        peopleReadiness,
        updatedAt,
        readinessList,
    } = props;

    const strings = useTranslation(i18n);

    const [
        showReadinessInfo,
        {
            setTrue: setShowReadinessInfoTrue,
            setFalse: setShowReadinessInfoFalse,
        },
    ] = useBooleanState(false);

    return (
        <Container
            className={_cs(styles.emergencyResponseTypeCard, className)}
            withInternalPadding
            withHeaderBorder
            heading={typeDisplay}
            headerDescription={(
                <TextOutput
                    label={strings.emergencyResponseUnitOwnerCardLastUpdated}
                    value={updatedAt}
                    valueType="date"
                />
            )}
            withFooterBorder
            footerActions={(
                <Button
                    name={undefined}
                    onClick={setShowReadinessInfoTrue}
                    variant="tertiary"
                    title={strings.eruSeeReadinessInfoButton}
                >
                    {strings.eruSeeReadinessInfoButton}
                </Button>
            )}
            childrenContainerClassName={styles.content}
        >
            <TextOutput
                className={styles.eruOwners}
                label={strings.emergencyResponseUnitNationalSociety}
                value={nationalSocieties}
                strongValue
            />
            <div className={styles.separator} />
            <ReadinessIcon
                readinessType={equipmentReadiness}
                label={strings.eruEquipmentReadiness}
            />
            <div className={styles.verticalSeparator} />
            <ReadinessIcon
                readinessType={peopleReadiness}
                label={strings.eruPeopleReadiness}
            />
            <div className={styles.verticalSeparator} />
            <ReadinessIcon
                readinessType={fundingReadiness}
                label={strings.eruFundingReadiness}
            />
            {showReadinessInfo && (
                <Modal
                    className={styles.modal}
                    heading={typeDisplay}
                    headerDescription={strings.eruReadinessInformationHeading}
                    onClose={setShowReadinessInfoFalse}
                    withHeaderBorder
                    size="md"
                    contentViewType="vertical"
                    spacing="comfortable"
                >
                    {readinessList?.map((readiness) => (
                        <Container
                            key={readiness.id}
                            heading={
                                readiness.eruOwner.national_society_country_details.society_name
                            }
                            headingLevel={5}
                            withHeaderBorder
                            childrenContainerClassName={styles.readinessContainer}
                            spacing="compact"
                        >
                            <ReadinessIcon
                                readinessType={readiness.equipment_readiness}
                                label={strings.eruEquipmentReadiness}
                            />
                            <div className={styles.verticalSeparator} />
                            <ReadinessIcon
                                readinessType={readiness.people_readiness}
                                label={strings.eruPeopleReadiness}
                            />
                            <div className={styles.verticalSeparator} />
                            <ReadinessIcon
                                readinessType={readiness.funding_readiness}
                                label={strings.eruFundingReadiness}
                            />
                            <div className={styles.separator} />
                        </Container>
                    ))}
                </Modal>
            )}
        </Container>
    );
}

export default EmergencyResponseUnitTypeCard;
