import { useState } from 'react';
import { PageContainer, Heading, Container, SegmentInput, Checkbox } from '@ifrc-go/ui';
import CustomSwitch from '../components/CustomSwitch';
import styles from './DemoPage.module.css';

export default function DemoPage() {
  // SegmentInput switches
  const [switch1, setSwitch1] = useState<'on' | 'off'>('off');
  const [switch2, setSwitch2] = useState<'on' | 'off'>('on');
  
  // IFRC Checkbox switches
  const [switch3, setSwitch3] = useState(false);
  const [switch4, setSwitch4] = useState(true);
  
  // Native HTML checkbox switches
  const [switch5, setSwitch5] = useState(false);
  const [switch6, setSwitch6] = useState(true);
  
  // Custom CSS toggle switches
  const [switch7, setSwitch7] = useState(false);
  const [switch8, setSwitch8] = useState(true);
  const [switch9, setSwitch9] = useState(false);
  
  // Button-based toggle
  const [switch10, setSwitch10] = useState(false);

  return (
    <PageContainer className="py-10">
      <div className={styles.demoContainer}>
        <div className="space-y-12">
          <div className={styles.section}>
            <Heading level={2} className={styles.pageTitle}>Switch Components Demo</Heading>
            <p className={styles.description}>
              This page showcases all available switch/toggle implementations. Each switch is clearly labeled
              so you can easily identify and compare different UI patterns.
            </p>
          </div>

          {/* SegmentInput Switches */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>1. SegmentInput Switches (IFRC UI)</Heading>
              <p className={styles.sectionDescription}>
                Using SegmentInput component for binary on/off choices
              </p>
            </div>
            
            <div className={styles.switchGrid}>
              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Switch 1: SegmentInput (Off by default)</div>
                <Container withInternalPadding className={styles.switchWrapper}>
                  <SegmentInput
                    name="switch-1"
                    value={switch1}
                    onChange={(value) => {
                      if (value === 'on' || value === 'off') {
                        setSwitch1(value);
                      }
                    }}
                    options={[
                      { key: 'off', label: 'Off' },
                      { key: 'on', label: 'On' }
                    ]}
                    keySelector={(o) => o.key}
                    labelSelector={(o) => o.label}
                  />
                </Container>
                <div className={styles.stateDisplay}>
                  State: <strong>{switch1}</strong>
                </div>
              </div>

              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Switch 2: SegmentInput (On by default)</div>
                <Container withInternalPadding className={styles.switchWrapper}>
                  <SegmentInput
                    name="switch-2"
                    value={switch2}
                    onChange={(value) => {
                      if (value === 'on' || value === 'off') {
                        setSwitch2(value);
                      }
                    }}
                    options={[
                      { key: 'off', label: 'Off' },
                      { key: 'on', label: 'On' }
                    ]}
                    keySelector={(o) => o.key}
                    labelSelector={(o) => o.label}
                  />
                </Container>
                <div className={styles.stateDisplay}>
                  State: <strong>{switch2}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* IFRC Checkbox Switches */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>2. IFRC Checkbox Switches</Heading>
              <p className={styles.sectionDescription}>
                Using Checkbox component from @ifrc-go/ui for on/off toggles
              </p>
            </div>
            
            <div className={styles.switchGrid}>
              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Switch 3: IFRC Checkbox (Off by default)</div>
                <Checkbox
                  name="switch-3"
                  value={switch3}
                  onChange={setSwitch3}
                  label="Enable feature"
                />
                <div className={styles.stateDisplay}>
                  State: <strong>{switch3 ? 'On' : 'Off'}</strong>
                </div>
              </div>

              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Switch 4: IFRC Checkbox (On by default)</div>
                <Checkbox
                  name="switch-4"
                  value={switch4}
                  onChange={setSwitch4}
                  label="Auto-save enabled"
                />
                <div className={styles.stateDisplay}>
                  State: <strong>{switch4 ? 'On' : 'Off'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Native HTML Checkbox Switches */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>3. Native HTML Checkbox Switches</Heading>
              <p className={styles.sectionDescription}>
                Using native HTML input[type="checkbox"] elements (as used in AdminPage)
              </p>
            </div>
            
            <div className={styles.switchGrid}>
              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Switch 5: Native Checkbox (Off by default)</div>
                <label className={styles.nativeCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={switch5}
                    onChange={(e) => setSwitch5(e.target.checked)}
                    className={styles.nativeCheckbox}
                  />
                  <span>Available for use</span>
                </label>
                <div className={styles.stateDisplay}>
                  State: <strong>{switch5 ? 'On' : 'Off'}</strong>
                </div>
              </div>

              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Switch 6: Native Checkbox (On by default)</div>
                <label className={styles.nativeCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={switch6}
                    onChange={(e) => setSwitch6(e.target.checked)}
                    className={styles.nativeCheckbox}
                  />
                  <span>RTK Fix Available</span>
                </label>
                <div className={styles.stateDisplay}>
                  State: <strong>{switch6 ? 'On' : 'Off'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Custom CSS Toggle Switches */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>4. Custom CSS Toggle Switches</Heading>
              <p className={styles.sectionDescription}>
                Custom-built toggle switch component with smooth animations
              </p>
            </div>
            
            <div className={styles.switchGrid}>
              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Switch 7: Custom Toggle (Off by default)</div>
                <CustomSwitch
                  name="switch-7"
                  checked={switch7}
                  onChange={setSwitch7}
                  label="Enable notifications"
                />
                <div className={styles.stateDisplay}>
                  State: <strong>{switch7 ? 'On' : 'Off'}</strong>
                </div>
              </div>

              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Switch 8: Custom Toggle (On by default)</div>
                <CustomSwitch
                  name="switch-8"
                  checked={switch8}
                  onChange={setSwitch8}
                  label="Dark mode"
                />
                <div className={styles.stateDisplay}>
                  State: <strong>{switch8 ? 'On' : 'Off'}</strong>
                </div>
              </div>

              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Switch 9: Custom Toggle (No label, Off by default)</div>
                <CustomSwitch
                  name="switch-9"
                  checked={switch9}
                  onChange={setSwitch9}
                />
                <div className={styles.stateDisplay}>
                  State: <strong>{switch9 ? 'On' : 'Off'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Button-based Toggle */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>5. Button-based Toggle Switch</Heading>
              <p className={styles.sectionDescription}>
                Using a button element styled as a toggle switch
              </p>
            </div>
            
            <div className={styles.switchItem}>
              <div className={styles.switchLabel}>Switch 10: Button Toggle (Off by default)</div>
              <button
                type="button"
                className={`${styles.buttonToggle} ${switch10 ? styles.buttonToggleOn : styles.buttonToggleOff}`}
                onClick={() => setSwitch10(!switch10)}
              >
                <span className={styles.buttonToggleText}>{switch10 ? 'On' : 'Off'}</span>
              </button>
              <div className={styles.stateDisplay}>
                State: <strong>{switch10 ? 'On' : 'Off'}</strong>
              </div>
            </div>
          </div>

          {/* Disabled States */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>6. Disabled Switch States</Heading>
              <p className={styles.sectionDescription}>
                Examples of switches in disabled state
              </p>
            </div>
            
            <div className={styles.switchGrid}>
              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Disabled SegmentInput</div>
                <Container withInternalPadding className={styles.switchWrapper}>
                  <SegmentInput
                    name="disabled-segment"
                    value="on"
                    onChange={() => {}}
                    options={[
                      { key: 'off', label: 'Off' },
                      { key: 'on', label: 'On' }
                    ]}
                    keySelector={(o) => o.key}
                    labelSelector={(o) => o.label}
                    disabled={true}
                  />
                </Container>
              </div>

              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Disabled IFRC Checkbox</div>
                <Checkbox
                  name="disabled-checkbox"
                  value={true}
                  onChange={() => {}}
                  label="Disabled option"
                  disabled={true}
                />
              </div>

              <div className={styles.switchItem}>
                <div className={styles.switchLabel}>Disabled Custom Toggle</div>
                <CustomSwitch
                  name="disabled-custom"
                  checked={true}
                  onChange={() => {}}
                  label="Disabled toggle"
                  disabled={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
