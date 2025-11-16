import { Container, TextInput, SelectInput, MultiSelectInput } from '@ifrc-go/ui';
import styles from '../../pages/UploadPage/UploadPage.module.css';

interface MetadataFormSectionProps {
  files: File[];
  imageType: string;
  title: string;
  source: string;
  eventType: string;
  epsg: string;
  countries: string[];
  centerLon: string;
  centerLat: string;
  amslM: string;
  aglM: string;
  headingDeg: string;
  yawDeg: string;
  pitchDeg: string;
  rollDeg: string;
  rtkFix: boolean;
  stdHM: string;
  stdVM: string;
  metadataArray: Array<{
    source: string;
    eventType: string;
    epsg: string;
    countries: string[];
    centerLon: string;
    centerLat: string;
    amslM: string;
    aglM: string;
    headingDeg: string;
    yawDeg: string;
    pitchDeg: string;
    rollDeg: string;
    rtkFix: boolean;
    stdHM: string;
    stdVM: string;
  }>;
  sources: {s_code: string, label: string}[];
  types: {t_code: string, label: string}[];
  spatialReferences: {epsg: string, srid: string, proj4: string, wkt: string}[];
  imageTypes: {image_type: string, label: string}[];
  countriesOptions: {c_code: string, label: string, r_code: string}[];
  onTitleChange: (value: string | undefined) => void;
  onSourceChange: (value: string | undefined) => void;
  onEventTypeChange: (value: string | undefined) => void;
  onEpsgChange: (value: string | undefined) => void;
  onCountriesChange: (value: string[] | undefined) => void;
  onCenterLonChange: (value: string | undefined) => void;
  onCenterLatChange: (value: string | undefined) => void;
  onAmslMChange: (value: string | undefined) => void;
  onAglMChange: (value: string | undefined) => void;
  onHeadingDegChange: (value: string | undefined) => void;
  onYawDegChange: (value: string | undefined) => void;
  onPitchDegChange: (value: string | undefined) => void;
  onRollDegChange: (value: string | undefined) => void;
  onRtkFixChange: (value: boolean | undefined) => void;
  onStdHMChange: (value: string | undefined) => void;
  onStdVMChange: (value: string | undefined) => void;
  onImageTypeChange: (value: string | undefined) => void;
  updateMetadataForImage: (index: number, field: string, value: string | string[] | boolean | undefined) => void;
}

export default function MetadataFormSection({
  files,
  imageType,
  title,
  source,
  eventType,
  epsg,
  countries,
  centerLon,
  centerLat,
  amslM,
  aglM,
  headingDeg,
  yawDeg,
  pitchDeg,
  rollDeg,
  rtkFix,
  stdHM,
  stdVM,
  metadataArray,
  sources,
  types,
  spatialReferences,
  imageTypes,
  countriesOptions,
  onTitleChange,
  onSourceChange,
  onEventTypeChange,
  onEpsgChange,
  onCountriesChange,
  onCenterLonChange,
  onCenterLatChange,
  onAmslMChange,
  onAglMChange,
  onHeadingDegChange,
  onYawDegChange,
  onPitchDegChange,
  onRollDegChange,
  onRtkFixChange,
  onStdHMChange,
  onStdVMChange,
  onImageTypeChange,
  updateMetadataForImage,
}: MetadataFormSectionProps) {
  if (files.length > 1) {
    return (
      <div>
        <div className="mb-4">
          <TextInput
            label="Shared Title"
            name="title"
            value={title}
            onChange={onTitleChange}
            placeholder="Enter a title for all images..."
          />
        </div>
        {files.map((file, index) => (
          <div key={index} className="mb-6">
            <Container
              heading={`Image ${index + 1}: ${file.name}`}
              headingLevel={4}
              withHeaderBorder
              withInternalPadding
            >
              <div className={styles.formGrid}>
                {imageType !== 'drone_image' && (
                  <SelectInput
                    label="Source"
                    name={`source_${index}`}
                    value={metadataArray[index]?.source || ''}
                    onChange={(value) => updateMetadataForImage(index, 'source', value)}
                    options={sources}
                    keySelector={(o) => o.s_code}
                    labelSelector={(o) => o.label}
                    placeholder="Please select"
                  />
                )}
                <SelectInput
                  label="Event Type"
                  name={`event_type_${index}`}
                  value={metadataArray[index]?.eventType || ''}
                  onChange={(value) => updateMetadataForImage(index, 'eventType', value)}
                  options={types}
                  keySelector={(o) => o.t_code}
                  labelSelector={(o) => o.label}
                  placeholder="Please select"
                />
                <SelectInput
                  label="EPSG"
                  name={`epsg_${index}`}
                  value={metadataArray[index]?.epsg || ''}
                  onChange={(value) => updateMetadataForImage(index, 'epsg', value)}
                  options={spatialReferences}
                  keySelector={(o) => o.epsg}
                  labelSelector={(o) => `${o.srid} (EPSG:${o.epsg})`}
                  placeholder="Please select"
                />
                <MultiSelectInput
                  label="Countries (optional)"
                  name={`countries_${index}`}
                  value={metadataArray[index]?.countries || []}
                  onChange={(value) => updateMetadataForImage(index, 'countries', value)}
                  options={countriesOptions}
                  keySelector={(o) => o.c_code}
                  labelSelector={(o) => o.label}
                  placeholder="Select one or more"
                />
                
                {imageType === 'drone_image' && (
                  <>
                    <div className={styles.droneMetadataSection}>
                      <h4 className={styles.droneMetadataHeading}>Drone Flight Data</h4>
                      <div className={styles.droneMetadataGrid}>
                        <TextInput
                          label="Center Longitude"
                          name={`center_lon_${index}`}
                          value={metadataArray[index]?.centerLon || ''}
                          onChange={(value) => updateMetadataForImage(index, 'centerLon', value)}
                          placeholder="e.g., -122.4194"
                          step="any"
                        />
                        <TextInput
                          label="Center Latitude"
                          name={`center_lat_${index}`}
                          value={metadataArray[index]?.centerLat || ''}
                          onChange={(value) => updateMetadataForImage(index, 'centerLat', value)}
                          placeholder="e.g., 37.7749"
                          step="any"
                        />
                        <TextInput
                          label="Altitude AMSL (m)"
                          name={`amsl_m_${index}`}
                          value={metadataArray[index]?.amslM || ''}
                          onChange={(value) => updateMetadataForImage(index, 'amslM', value)}
                          placeholder="e.g., 100.5"
                          step="any"
                        />
                        <TextInput
                          label="Altitude AGL (m)"
                          name={`agl_m_${index}`}
                          value={metadataArray[index]?.aglM || ''}
                          onChange={(value) => updateMetadataForImage(index, 'aglM', value)}
                          placeholder="e.g., 50.2"
                          step="any"
                        />
                        <TextInput
                          label="Heading (degrees)"
                          name={`heading_deg_${index}`}
                          value={metadataArray[index]?.headingDeg || ''}
                          onChange={(value) => updateMetadataForImage(index, 'headingDeg', value)}
                          placeholder="e.g., 180.0"
                          step="any"
                        />
                        <TextInput
                          label="Yaw (degrees)"
                          name={`yaw_deg_${index}`}
                          value={metadataArray[index]?.yawDeg || ''}
                          onChange={(value) => updateMetadataForImage(index, 'yawDeg', value)}
                          placeholder="e.g., 90.0"
                          step="any"
                        />
                        <TextInput
                          label="Pitch (degrees)"
                          name={`pitch_deg_${index}`}
                          value={metadataArray[index]?.pitchDeg || ''}
                          onChange={(value) => updateMetadataForImage(index, 'pitchDeg', value)}
                          placeholder="e.g., 0.0"
                          step="any"
                        />
                        <TextInput
                          label="Roll (degrees)"
                          name={`roll_deg_${index}`}
                          value={metadataArray[index]?.rollDeg || ''}
                          onChange={(value) => updateMetadataForImage(index, 'rollDeg', value)}
                          placeholder="e.g., 0.0"
                          step="any"
                        />
                        <div className={styles.rtkFixContainer}>
                          <label className={styles.rtkFixLabel}>
                            <input
                              type="checkbox"
                              checked={metadataArray[index]?.rtkFix || false}
                              onChange={(e) => updateMetadataForImage(index, 'rtkFix', e.target.checked)}
                              className={styles.rtkFixCheckbox}
                            />
                            RTK Fix Available
                          </label>
                        </div>
                        <TextInput
                          label="Horizontal Std Dev (m)"
                          name={`std_h_m_${index}`}
                          value={metadataArray[index]?.stdHM || ''}
                          onChange={(value) => updateMetadataForImage(index, 'stdHM', value)}
                          placeholder="e.g., 0.1"
                          step="any"
                        />
                        <TextInput
                          label="Vertical Std Dev (m)"
                          name={`std_v_m_${index}`}
                          value={metadataArray[index]?.stdVM || ''}
                          onChange={(value) => updateMetadataForImage(index, 'stdVM', value)}
                          placeholder="e.g., 0.2"
                          step="any"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Container>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.formGrid}>
      <div className={styles.titleField}>
        <TextInput
          label="Title"
          name="title"
          value={title}
          onChange={onTitleChange}
          placeholder="Enter a title for this map..."
        />
      </div>
      {imageType !== 'drone_image' && (
        <SelectInput
          label="Source"
          name="source"
          value={source}
          onChange={onSourceChange}
          options={sources}
          keySelector={(o) => o.s_code}
          labelSelector={(o) => o.label}
          placeholder="Please select"
        />
      )}
      <SelectInput
        label="Event Type"
        name="event_type"
        value={eventType}
        onChange={onEventTypeChange}
        options={types}
        keySelector={(o) => o.t_code}
        labelSelector={(o) => o.label}
        placeholder="Please select"
      />
      <SelectInput
        label="EPSG"
        name="epsg"
        value={epsg}
        onChange={onEpsgChange}
        options={spatialReferences}
        keySelector={(o) => o.epsg}
        labelSelector={(o) => `${o.srid} (EPSG:${o.epsg})`}
        placeholder="Please select"
      />
      <SelectInput
        label="Image Type"
        name="image_type"
        value={imageType}
        onChange={onImageTypeChange}
        options={imageTypes}
        keySelector={(o) => o.image_type}
        labelSelector={(o) => o.label}
      />
      <MultiSelectInput
        label="Countries (optional)"
        name="countries"
        value={countries}
        onChange={onCountriesChange}
        options={countriesOptions}
        keySelector={(o) => o.c_code}
        labelSelector={(o) => o.label}
        placeholder="Select one or more"
      />
      
      {imageType === 'drone_image' && (
        <>
          <div className={styles.droneMetadataSection}>
            <h4 className={styles.droneMetadataHeading}>Drone Flight Data</h4>
            <div className={styles.droneMetadataGrid}>
              <TextInput
                label="Center Longitude"
                name="center_lon"
                value={centerLon}
                onChange={onCenterLonChange}
                placeholder="e.g., -122.4194"
                step="any"
              />
              <TextInput
                label="Center Latitude"
                name="center_lat"
                value={centerLat}
                onChange={onCenterLatChange}
                placeholder="e.g., 37.7749"
                step="any"
              />
              <TextInput
                label="Altitude AMSL (m)"
                name="amsl_m"
                value={amslM}
                onChange={onAmslMChange}
                placeholder="e.g., 100.5"
                step="any"
              />
              <TextInput
                label="Altitude AGL (m)"
                name="agl_m"
                value={aglM}
                onChange={onAglMChange}
                placeholder="e.g., 50.2"
                step="any"
              />
              <TextInput
                label="Heading (degrees)"
                name="heading_deg"
                value={headingDeg}
                onChange={onHeadingDegChange}
                placeholder="e.g., 180.0"
                step="any"
              />
              <TextInput
                label="Yaw (degrees)"
                name="yaw_deg"
                value={yawDeg}
                onChange={onYawDegChange}
                placeholder="e.g., 90.0"
                step="any"
              />
              <TextInput
                label="Pitch (degrees)"
                name="pitch_deg"
                value={pitchDeg}
                onChange={onPitchDegChange}
                placeholder="e.g., 0.0"
                step="any"
              />
              <TextInput
                label="Roll (degrees)"
                name="roll_deg"
                value={rollDeg}
                onChange={onRollDegChange}
                placeholder="e.g., 0.0"
                step="any"
              />
              <div className={styles.rtkFixContainer}>
                <label className={styles.rtkFixLabel}>
                  <input
                    type="checkbox"
                    checked={rtkFix}
                    onChange={(e) => onRtkFixChange(e.target.checked)}
                    className={styles.rtkFixCheckbox}
                  />
                  RTK Fix Available
                </label>
              </div>
              <TextInput
                label="Horizontal Std Dev (m)"
                name="std_h_m"
                value={stdHM}
                onChange={onStdHMChange}
                placeholder="e.g., 0.1"
                step="any"
              />
              <TextInput
                label="Vertical Std Dev (m)"
                name="std_v_m"
                value={stdVM}
                onChange={onStdVMChange}
                placeholder="e.g., 0.2"
                step="any"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
