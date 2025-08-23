import {
    useCallback,
    useMemo,
} from 'react';
import { useTranslation } from '@ifrc-go/ui/hooks';
import {
    createDateColumn,
    createNumberColumn,
    createProgressColumn,
    createStringColumn,
    DEFAULT_INVALID_TEXT,
    getDuration,
    getPercentage,
} from '@ifrc-go/ui/utils';
import { isNotDefined } from '@togglecorp/fujs';

import SeverityIndicator from '#components/domain/SeverityIndicator';
import {
    createCountryListColumn,
    createLinkColumn,
} from '#utils/domain/tableHelpers';
import { type GoApiResponse } from '#utils/restRequest';

import i18n from './i18n.json';

// TODO: update typing after removal of projects
type SearchResponse = Omit<GoApiResponse<'/api/v1/search/'>, 'projects'>;
type EmergencyResult = NonNullable<SearchResponse['emergencies']>[number];
type FieldReportResult = NonNullable<SearchResponse['reports']>[number];
type RapidResponseDeploymentResult = NonNullable<SearchResponse['rapid_response_deployments']>[number];
type SurgeAlertResult = NonNullable<SearchResponse['surge_alerts']>[number];
type SurgeDeploymentResult = NonNullable<SearchResponse['surge_deployments']>[number];

function useColumns(searchResponse: SearchResponse | undefined) {
    const strings = useTranslation(i18n);

    const getEmergencyColumns = useCallback(() => ([
        createLinkColumn<EmergencyResult, number>(
            'title',
            strings.searchEmergencyTableTitle,
            (emergency) => emergency.name,
            (emergency) => ({
                to: 'emergenciesLayout',
                urlParams: { emergencyId: String(emergency.id) },
                icons: (
                    <SeverityIndicator
                        title={emergency.severity_level_display}
                        level={emergency.severity_level}
                    />
                ),
            }),
        ),
        createStringColumn<EmergencyResult, number>(
            'appeal_type',
            strings.searchEmergencyTableAppealType,
            (emergency) => emergency.appeals.map((appeal) => appeal.atype).join(', ') ?? DEFAULT_INVALID_TEXT,
        ),
        createStringColumn<EmergencyResult, number>(
            'disaster_type',
            strings.searchEmergencyTableDisasterType,
            (emergency) => emergency.disaster_type,
        ),
        createNumberColumn<EmergencyResult, number>(
            'funding_requirements',
            strings.searchEmergencyTableFundingRequirements,
            (emergency) => Number(emergency.funding_requirements),
            {
                suffix: ' CHF',
            },
        ),
        createProgressColumn<EmergencyResult, number>(
            'funding_coverage',
            strings.searchEmergencyTableFundingCoverage,
            (emergency) => getPercentage(
                Number(emergency.funding_coverage),
                Number(emergency.funding_requirements),
            ),
        ),
        createCountryListColumn<EmergencyResult, number>(
            'countries',
            strings.searchEmergencyTableCountry,
            (item) => item.countries,
        ),
    ]), [
        strings.searchEmergencyTableTitle,
        strings.searchEmergencyTableAppealType,
        strings.searchEmergencyTableDisasterType,
        strings.searchEmergencyTableFundingRequirements,
        strings.searchEmergencyTableFundingCoverage,
        strings.searchEmergencyTableCountry,
    ]);

    const getRapidResponseDeploymentColumns = useCallback(() => ([
        createDateColumn<RapidResponseDeploymentResult, number>(
            'start_date',
            strings.searchRapidDeploymentTableStartDate,
            (rapidResponse) => rapidResponse.start_date,
        ),
        createDateColumn<RapidResponseDeploymentResult, number>(
            'end_date',
            strings.searchRapidDeploymentTableEndDate,
            (rapidResponse) => rapidResponse.end_date,
        ),
        createStringColumn<RapidResponseDeploymentResult, number>(
            'name',
            strings.searchRapidDeploymentTableName,
            (rapidResponse) => rapidResponse.name,
        ),
        createStringColumn<RapidResponseDeploymentResult, number>(
            'position',
            strings.searchRapidDeploymentTablePosition,
            (rapidResponse) => rapidResponse.position,
        ),
        createStringColumn<RapidResponseDeploymentResult, number>(
            'keywords',
            strings.searchRapidDeploymentTableKeywords,
            (rapidResponse) => rapidResponse.type,
        ),
        createLinkColumn<RapidResponseDeploymentResult, number>(
            'deploying_country_name',
            strings.searchRapidDeploymentTableDeployingParty,
            (rapidResponse) => rapidResponse.deploying_country_name,
            (rapidResponse) => ({
                to: 'countriesLayout',
                urlParams: { countryId: rapidResponse.deploying_country_id },
            }),
        ),
        createLinkColumn<RapidResponseDeploymentResult, number>(
            'deployed_to_country_name',
            strings.searchRapidDeploymentTableDeployedTo,
            (rapidResponse) => rapidResponse.deployed_to_country_name,
            (rapidResponse) => ({
                to: 'countriesLayout',
                urlParams: { countryId: rapidResponse.deployed_to_country_id },
            }),
        ),
        createLinkColumn<RapidResponseDeploymentResult, number>(
            'event_name',
            strings.searchRapidDeploymentTableEmergency,
            (rapidResponse) => rapidResponse.event_name,
            (rapidResponse) => ({
                to: 'emergenciesLayout',
                urlParams: { emergencyId: rapidResponse.event_id },
            }),
        ),
    ]), [
        strings.searchRapidDeploymentTableStartDate,
        strings.searchRapidDeploymentTableEndDate,
        strings.searchRapidDeploymentTableName,
        strings.searchRapidDeploymentTablePosition,
        strings.searchRapidDeploymentTableKeywords,
        strings.searchRapidDeploymentTableDeployingParty,
        strings.searchRapidDeploymentTableDeployedTo,
        strings.searchRapidDeploymentTableEmergency,
    ]);

    const getSurgeAlertColumns = useCallback(() => ([
        createDateColumn<SurgeAlertResult, number>(
            'alert_date',
            strings.searchSurgeAlertTableAlertDate,
            (surgeAlert) => surgeAlert.alert_date,
        ),
        // TODO: createDurationColumn
        createStringColumn<SurgeAlertResult, number>(
            'duration',
            strings.searchSurgeAlertTableDuration,
            (surgeAlert) => {
                if (isNotDefined(surgeAlert.alert_date)) {
                    return DEFAULT_INVALID_TEXT;
                }

                const alertDate = new Date(surgeAlert.alert_date);
                const deadline = new Date(surgeAlert.deadline);
                const duration = getDuration(alertDate, deadline);

                return duration;
            },
        ),
        createDateColumn<SurgeAlertResult, number>(
            'start_date',
            strings.searchSurgeAlertTableStartDate,
            (surgeAlert) => surgeAlert.start_date,
        ),
        createStringColumn<SurgeAlertResult, number>(
            'name',
            strings.searchSurgeAlertTablePosition,
            (surgeAlert) => surgeAlert.name,
        ),
        createStringColumn<SurgeAlertResult, number>(
            'keywords',
            strings.searchSurgeAlertTableKeywords,
            (surgeAlert) => surgeAlert.keywords?.join(', '),
        ),
        createLinkColumn<SurgeAlertResult, number>(
            'event_name',
            strings.searchSurgeAlertTableEmergency,
            (surgeAlert) => surgeAlert.event_name,
            (surgeAlert) => ({
                to: 'emergenciesLayout',
                urlParams: {
                    emergencyId: surgeAlert.event_id,
                },
            }),
        ),
        createLinkColumn<SurgeAlertResult, number>(
            'country',
            strings.searchSurgeAlertTableCountry,
            (surgeAlert) => surgeAlert.country,
            (surgeAlert) => ({
                to: 'countriesLayout',
                urlParams: {
                    countryId: surgeAlert.country_id,
                },
            }),
        ),
        createStringColumn<SurgeAlertResult, number>(
            'status',
            strings.searchSurgeAlertTableStatus,
            (surgeAlert) => surgeAlert.status,
        ),
    ]), [
        strings.searchSurgeAlertTableAlertDate,
        strings.searchSurgeAlertTableDuration,
        strings.searchSurgeAlertTableStartDate,
        strings.searchSurgeAlertTablePosition,
        strings.searchSurgeAlertTableKeywords,
        strings.searchSurgeAlertTableEmergency,
        strings.searchSurgeAlertTableCountry,
        strings.searchSurgeAlertTableStatus,
    ]);

    const getSurgeDeploymentColumns = useCallback(() => ([
        createStringColumn<SurgeDeploymentResult, number>(
            'owner',
            strings.searchSurgeDeploymentTableOwner,
            (surgeDeployment) => surgeDeployment.owner,
        ),
        createStringColumn<SurgeDeploymentResult, number>(
            'type',
            strings.searchSurgeDeploymentTableType,
            (surgeDeployment) => surgeDeployment.type,
        ),
        createNumberColumn<SurgeDeploymentResult, number>(
            'personnel_units',
            strings.searchSurgeDeploymentTablePersonnelUnits,
            (surgeDeployment) => surgeDeployment.personnel_units,
        ),
        createNumberColumn<SurgeDeploymentResult, number>(
            'equipment_units',
            strings.searchSurgeDeploymentTableEquipmentUnits,
            (surgeDeployment) => surgeDeployment.equipment_units,
        ),
        createLinkColumn<SurgeDeploymentResult, number>(
            'deployed_country',
            strings.searchSurgeDeploymentsTableCountryDeployedTo,
            (surgeDeployment) => surgeDeployment.deployed_country,
            (surgeDeployment) => ({
                to: 'countriesLayout',
                urlParams: { countryId: surgeDeployment.deployed_country_id },
            }),
        ),
        createLinkColumn<SurgeDeploymentResult, number>(
            'event_name',
            strings.searchSurgeDeploymentsTableEmergency,
            (surgeDeployment) => surgeDeployment.event_name,
            (surgeDeployment) => ({
                to: 'emergenciesLayout',
                urlParams: { emergencyId: surgeDeployment.event_id },
            }),
        ),
    ]), [
        strings.searchSurgeDeploymentTableOwner,
        strings.searchSurgeDeploymentTableType,
        strings.searchSurgeDeploymentTablePersonnelUnits,
        strings.searchSurgeDeploymentTableEquipmentUnits,
        strings.searchSurgeDeploymentsTableCountryDeployedTo,
        strings.searchSurgeDeploymentsTableEmergency,
    ]);

    const getFieldReportColumns = useCallback(() => (
        [
            createDateColumn<FieldReportResult, number>(
                'created_at',
                strings.searchFieldReportTableDate,
                (fieldReport) => fieldReport.created_at,
            ),
            createStringColumn<FieldReportResult, number>(
                'type',
                strings.searchFieldReportTableType,
                (fieldReport) => fieldReport.type,
            ),
            createLinkColumn<FieldReportResult, number>(
                'name',
                strings.searchFieldReportTableTitle,
                (fieldReport) => fieldReport.name,
                (fieldReport) => ({
                    to: 'fieldReportDetails',
                    urlParams: {
                        fieldReportId: fieldReport.id,
                    },
                }),
            ),
        ]
    ), [
        strings.searchFieldReportTableDate,
        strings.searchFieldReportTableType,
        strings.searchFieldReportTableTitle,
    ]);

    const columnMap = useMemo(
        () => ({
            reports: {
                columns: getFieldReportColumns(),
                keySelector: (item: FieldReportResult) => item.id,
                data: searchResponse?.reports as FieldReportResult[],
            },
            emergencies: {
                columns: getEmergencyColumns(),
                keySelector: (item: EmergencyResult) => item.id,
                data: searchResponse?.emergencies as EmergencyResult[],
            },
            rapid_response_deployments: {
                columns: getRapidResponseDeploymentColumns(),
                keySelector: (item: RapidResponseDeploymentResult) => item.id,
                data: searchResponse?.rapid_response_deployments,
            },
            surge_alerts: {
                columns: getSurgeAlertColumns(),
                keySelector: (item: SurgeAlertResult) => item.id,
                data: searchResponse?.surge_alerts,
            },
            surge_deployments: {
                columns: getSurgeDeploymentColumns(),
                keySelector: (item: SurgeDeploymentResult) => item.id,
                data: searchResponse?.surge_deployments,
            },
        }),
        [
            getFieldReportColumns,
            getRapidResponseDeploymentColumns,
            getSurgeAlertColumns,
            getSurgeDeploymentColumns,
            searchResponse,
            getEmergencyColumns,
        ],
    );

    return columnMap;
}

export default useColumns;
