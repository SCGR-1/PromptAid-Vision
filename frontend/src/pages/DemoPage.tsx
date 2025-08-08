import { useState } from 'react';
import {
  PageContainer,
  Heading,
  Button,
  TextInput,
  SelectInput,
  MultiSelectInput,
  SearchSelectInput,
  SearchMultiSelectInput,
  TextArea,
  Checkbox,
  Radio,
  Switch,
  DateInput,
  NumberInput,
  PasswordInput,
  RawFileInput,
  Container,
  Alert,
  Message,
  Spinner,
  ProgressBar,
  StackedProgressBar,
  KeyFigure,
  PieChart,
  BarChart,
  TimeSeriesChart,
  Table,
  HeaderCell,
  TableRow,
  TableData,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  Chip,
  Tooltip,
  Modal,
  Popup,
  DropdownMenu,
  IconButton,
  ConfirmButton,
  Breadcrumbs,
  List,
  Grid,
  ExpandableContainer,
  BlockLoading,
  InputContainer,
  InputLabel,
  InputHint,
  InputError,
  InputSection,
  BooleanInput,
  BooleanOutput,
  DateOutput,
  DateRangeOutput,
  NumberOutput,
  TextOutput,
  HtmlOutput,
  DismissableTextOutput,
  DismissableListOutput,
  DismissableMultiListOutput,
  Legend,
  LegendItem,
  ChartContainer,
  ChartAxes,
  InfoPopup,
  Footer,
  NavigationTabList,
  Pager,
  RawButton,
  RawInput,
  RawTextArea,
  RawList,
  SegmentInput,
  SelectInputContainer,
  ReducedListDisplay,
  Image,
  TopBanner,
} from '@ifrc-go/ui';
import {
  UploadCloudLineIcon,
  ArrowRightLineIcon,
  SearchLineIcon,
  QuestionLineIcon,
  GoMainIcon,
  StarLineIcon,
  DashboardIcon,
  AnalysisIcon,
  FilterLineIcon,
  DropLineIcon,
  CartIcon,
  ChevronDownLineIcon,
  ChevronUpLineIcon,
  CloseLineIcon,
  EditLineIcon,
  DeleteBinLineIcon,
  DownloadLineIcon,
  ShareLineIcon,
  SettingsLineIcon,
  RulerLineIcon,
  MagicLineIcon,
  PantoneLineIcon,
  MarkupLineIcon,
  CalendarLineIcon,
  LockLineIcon,
  LocationIcon,
  HeartLineIcon,
  ThumbUpLineIcon,
  ThumbDownLineIcon,
  EyeLineIcon,
  EyeOffLineIcon,
  CheckLineIcon,
  CropLineIcon,
  AlertLineIcon,
  InfoIcon,
  AlarmWarningLineIcon,
  SliceLineIcon,
  ArrowLeftLineIcon,
  ArrowDownLineIcon,
  ArrowUpLineIcon,
  MenuLineIcon,
  MoreLineIcon,
  RefreshLineIcon,
  PaintLineIcon,
  NotificationIcon,
  HammerLineIcon,
  ShapeLineIcon,
  LinkLineIcon,
  ExternalLinkLineIcon,
  CopyLineIcon,
} from '@ifrc-go/icons';

export default function DemoPage() {
  const [showModal, setShowModal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [activeTab, setActiveTab] = useState('components');
  const [loading, setLoading] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [multiSelectValue, setMultiSelectValue] = useState<string[]>([]);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [switchValue, setSwitchValue] = useState(false);
  const [dateValue, setDateValue] = useState<string>('');
  const [numberValue, setNumberValue] = useState<number | undefined>();
  const [passwordValue, setPasswordValue] = useState('');
  const [booleanValue, setBooleanValue] = useState(false);
  const [segmentValue, setSegmentValue] = useState('option1');

  // Dummy data
  const dummyOptions = [
    { key: 'option1', label: 'Option 1' },
    { key: 'option2', label: 'Option 2' },
    { key: 'option3', label: 'Option 3' },
    { key: 'option4', label: 'Option 4' },
  ];

  const dummyCountries = [
    { c_code: 'US', label: 'United States', r_code: 'NAM' },
    { c_code: 'CA', label: 'Canada', r_code: 'NAM' },
    { c_code: 'MX', label: 'Mexico', r_code: 'NAM' },
    { c_code: 'BR', label: 'Brazil', r_code: 'SAM' },
    { c_code: 'AR', label: 'Argentina', r_code: 'SAM' },
    { c_code: 'UK', label: 'United Kingdom', r_code: 'EUR' },
    { c_code: 'DE', label: 'Germany', r_code: 'EUR' },
    { c_code: 'FR', label: 'France', r_code: 'EUR' },
  ];

  const dummyTableData = [
    { id: 1, name: 'John Doe', age: 30, country: 'United States', status: 'Active' },
    { id: 2, name: 'Jane Smith', age: 25, country: 'Canada', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', age: 35, country: 'Mexico', status: 'Active' },
    { id: 4, name: 'Alice Brown', age: 28, country: 'Brazil', status: 'Active' },
  ];

  const dummyChartData = [
    { name: 'Red Cross', value: 45 },
    { name: 'UNICEF', value: 30 },
    { name: 'WHO', value: 15 },
    { name: 'WFP', value: 10 },
  ];

  const dummyTimeSeriesData = [
    { date: '2024-01', value: 100 },
    { date: '2024-02', value: 120 },
    { date: '2024-03', value: 110 },
    { date: '2024-04', value: 140 },
    { date: '2024-05', value: 130 },
    { date: '2024-06', value: 160 },
  ];

  const dummyBarData = [
    { name: 'Q1', value: 100 },
    { name: 'Q2', value: 150 },
    { name: 'Q3', value: 120 },
    { name: 'Q4', value: 180 },
  ];

  const handleLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const handleTextChange = (value: string | undefined, name: string) => {
    setTextValue(value || '');
  };

  const handlePasswordChange = (value: string | undefined, name: string) => {
    setPasswordValue(value || '');
  };

  const handleNumberChange = (value: number | undefined, name: string) => {
    setNumberValue(value);
  };

  const handleDateChange = (value: string | undefined, name: string) => {
    setDateValue(value || '');
  };

  const handleSelectChange = (value: string | undefined, name: string) => {
    setSelectValue(value || '');
  };

  const handleMultiSelectChange = (value: string[], name: string) => {
    setMultiSelectValue(value);
  };

  const handleCheckboxChange = (value: boolean, name: string) => {
    setCheckboxValue(value);
  };

  const handleRadioChange = (value: string, name: string) => {
    setRadioValue(value);
  };

  const handleSwitchChange = (value: boolean, name: string) => {
    setSwitchValue(value);
  };

  const handleBooleanChange = (value: boolean, name: string) => {
    setBooleanValue(value);
  };

  const handleSegmentChange = (value: string, name: string) => {
    setSegmentValue(value);
  };

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Header Section */}
        <Container heading="Navigation & Header Components" headingLevel={2} withHeaderBorder withInternalPadding>
          <div className="space-y-6">
            {/* Navigation Tabs */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Navigation Tab List</h3>
              <NavigationTabList variant="primary">
                <Button name="upload" variant="primary">Upload</Button>
                <Button name="analytics" variant="secondary">Analytics</Button>
                <Button name="explore" variant="secondary">Explore</Button>
                <Button name="help" variant="secondary">Help</Button>
              </NavigationTabList>
            </div>

            {/* Top Banner */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Top Banner</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-blue-900">Important Notice</h4>
                    <p className="text-blue-700 mt-1">This is a top banner component for important announcements.</p>
                  </div>
                  <Button name="dismiss" variant="secondary" size={1}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Breadcrumbs</h3>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <a href="/" className="text-gray-500 hover:text-gray-700">Home</a>
                  </li>
                  <li>
                    <span className="mx-2 text-gray-400">/</span>
                  </li>
                  <li>
                    <a href="/analytics" className="text-gray-500 hover:text-gray-700">Analytics</a>
                  </li>
                  <li>
                    <span className="mx-2 text-gray-400">/</span>
                  </li>
                  <li>
                    <span className="text-gray-900">Reports</span>
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </Container>

        {/* Basic Components */}
        <Container heading="Basic Components" headingLevel={2} withHeaderBorder withInternalPadding>
          <div className="space-y-6">
            {/* Buttons */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Buttons</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button name="primary" variant="primary">Primary Button</Button>
                <Button name="secondary" variant="secondary">Secondary Button</Button>
                <Button name="tertiary" variant="tertiary">Tertiary Button</Button>
                <Button name="disabled" disabled>Disabled Button</Button>
                <Button name="loading" onClick={handleLoading} disabled={loading}>
                  {loading ? <Spinner /> : 'Loading Button'}
                </Button>
                <ConfirmButton name="confirm" onConfirm={() => alert('Confirmed!')}>
                  Confirm Button
                </ConfirmButton>
                <Button name="with-icon" variant="primary">
                  <UploadCloudLineIcon className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </div>

            {/* Icon Buttons */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Icon Buttons</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <IconButton name="upload" variant="primary" title="Upload" ariaLabel="Upload">
                  <UploadCloudLineIcon />
                </IconButton>
                <IconButton name="search" variant="secondary" title="Search" ariaLabel="Search">
                  <SearchLineIcon />
                </IconButton>
                <IconButton name="edit" variant="tertiary" title="Edit" ariaLabel="Edit">
                  <EditLineIcon />
                </IconButton>
                <IconButton name="delete" variant="tertiary" title="Delete" ariaLabel="Delete">
                  <DeleteBinLineIcon />
                </IconButton>
                <IconButton name="download" variant="tertiary" title="Download" ariaLabel="Download">
                  <DownloadLineIcon />
                </IconButton>
                <IconButton name="share" variant="tertiary" title="Share" ariaLabel="Share">
                  <ShareLineIcon />
                </IconButton>
              </div>
            </div>

            {/* Chips */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Chips</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Primary Chip
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Secondary Chip
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Tertiary Chip
                </span>
              </div>
            </div>

            {/* Tooltips */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Tooltips</h3>
              <div className="flex gap-4">
                <div className="relative group">
                  <Button name="tooltip">Hover me</Button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    This is a tooltip
                  </div>
                </div>
                <div className="relative group">
                  <IconButton name="tooltip-icon" variant="tertiary" title="Info" ariaLabel="Info">
                    <InfoIcon />
                  </IconButton>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Another tooltip
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* Form Elements */}
        <Container heading="Form Elements" headingLevel={2} withHeaderBorder withInternalPadding>
          <div className="space-y-6">
            {/* Text Inputs */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Text Inputs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputSection>
                  <InputLabel>Text Input</InputLabel>
                  <TextInput
                    name="text"
                    value={textValue}
                    onChange={handleTextChange}
                    placeholder="Enter text..."
                  />
                  <InputHint>This is a hint text</InputHint>
                </InputSection>

                <InputSection>
                  <InputLabel>Password Input</InputLabel>
                  <PasswordInput
                    name="password"
                    value={passwordValue}
                    onChange={handlePasswordChange}
                    placeholder="Enter password..."
                  />
                </InputSection>

                <InputSection>
                  <InputLabel>Number Input</InputLabel>
                  <NumberInput
                    name="number"
                    value={numberValue}
                    onChange={handleNumberChange}
                    placeholder="Enter number..."
                  />
                </InputSection>

                <InputSection>
                  <InputLabel>Date Input</InputLabel>
                  <DateInput
                    name="date"
                    value={dateValue}
                    onChange={handleDateChange}
                    placeholder="Select date..."
                  />
                </InputSection>

                <InputSection>
                  <InputLabel>Text Area</InputLabel>
                  <TextArea
                    name="textarea"
                    value=""
                    onChange={() => {}}
                    placeholder="Enter long text..."
                    rows={4}
                  />
                </InputSection>

                <InputSection>
                  <InputLabel>File Input</InputLabel>
                  <RawFileInput
                    name="file"
                    accept="image/*"
                    onChange={() => {}}
                  />
                </InputSection>
              </div>
            </div>

            {/* Select Inputs */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Inputs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputSection>
                  <InputLabel>Select Input</InputLabel>
                  <SelectInput
                    name="select"
                    value={selectValue}
                    onChange={handleSelectChange}
                    options={dummyOptions}
                    keySelector={(o) => o.key}
                    labelSelector={(o) => o.label}
                    placeholder="Select an option..."
                  />
                </InputSection>

                <InputSection>
                  <InputLabel>Multi Select Input</InputLabel>
                  <MultiSelectInput
                    name="multiselect"
                    value={multiSelectValue}
                    onChange={handleMultiSelectChange}
                    options={dummyCountries}
                    keySelector={(o) => o.c_code}
                    labelSelector={(o) => o.label}
                    placeholder="Select countries..."
                  />
                </InputSection>

                <InputSection>
                  <InputLabel>Search Select Input</InputLabel>
                  <SearchSelectInput
                    name="searchselect"
                    value=""
                    onChange={() => {}}
                    options={dummyCountries}
                    keySelector={(o) => o.c_code}
                    labelSelector={(o) => o.label}
                    placeholder="Search countries..."
                    selectedOnTop
                  />
                </InputSection>

                <InputSection>
                  <InputLabel>Search Multi Select Input</InputLabel>
                  <SearchMultiSelectInput
                    name="searchmultiselect"
                    value={[]}
                    onChange={() => {}}
                    options={dummyCountries}
                    keySelector={(o) => o.c_code}
                    labelSelector={(o) => o.label}
                    placeholder="Search and select countries..."
                    selectedOnTop
                  />
                </InputSection>
              </div>
            </div>

            {/* Checkboxes & Radios */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Checkboxes & Radios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputSection>
                  <InputLabel>Checkbox</InputLabel>
                  <Checkbox
                    name="checkbox"
                    value={checkboxValue}
                    onChange={handleCheckboxChange}
                    label="Accept terms and conditions"
                  />
                </InputSection>

                <InputSection>
                  <InputLabel>Radio Buttons</InputLabel>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="radio"
                        value="option1"
                        checked={radioValue === 'option1'}
                        onChange={(e) => handleRadioChange(e.target.value, 'radio')}
                        className="mr-2"
                      />
                      <span className="text-sm">Option 1</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="radio"
                        value="option2"
                        checked={radioValue === 'option2'}
                        onChange={(e) => handleRadioChange(e.target.value, 'radio')}
                        className="mr-2"
                      />
                      <span className="text-sm">Option 2</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="radio"
                        value="option3"
                        checked={radioValue === 'option3'}
                        onChange={(e) => handleRadioChange(e.target.value, 'radio')}
                        className="mr-2"
                      />
                      <span className="text-sm">Option 3</span>
                    </label>
                  </div>
                </InputSection>

                <InputSection>
                  <InputLabel>Switch</InputLabel>
                  <Switch
                    name="switch"
                    value={switchValue}
                    onChange={handleSwitchChange}
                    label="Enable notifications"
                  />
                </InputSection>

                <InputSection>
                  <InputLabel>Boolean Input</InputLabel>
                  <BooleanInput
                    name="boolean"
                    value={booleanValue}
                    onChange={handleBooleanChange}
                    label="Enable feature"
                  />
                </InputSection>
              </div>
            </div>

            {/* Segment Input */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Segment Input</h3>
              <InputSection>
                <InputLabel>Segment Input</InputLabel>
                <SegmentInput
                  name="segment"
                  value={segmentValue}
                  onChange={handleSegmentChange}
                  options={dummyOptions}
                  keySelector={(o) => o.key}
                  labelSelector={(o) => o.label}
                />
              </InputSection>
            </div>
          </div>
        </Container>

        {/* Data Display */}
        <Container heading="Data Display" headingLevel={2} withHeaderBorder withInternalPadding>
          <div className="space-y-6">
            {/* Key Figures */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Key Figures</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KeyFigure value={1234} label="Total Users" />
                <KeyFigure value={567} label="Active Projects" />
                <KeyFigure value={89} label="Countries" />
                <KeyFigure value={12.5} label="Growth Rate" suffix="%" />
              </div>
            </div>

            {/* Charts */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Charts</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-md font-semibold mb-4">Pie Chart</h4>
                  <PieChart
                    data={dummyChartData}
                    valueSelector={(d) => d.value}
                    labelSelector={(d) => d.name}
                    keySelector={(d) => d.name}
                    colorSelector={(d) => '#dc2626'}
                    showPercentageInLegend
                  />
                </div>
                <div>
                  <h4 className="text-md font-semibold mb-4">Bar Chart</h4>
                  <BarChart
                    data={dummyBarData}
                    valueSelector={(d) => d.value}
                    labelSelector={(d) => d.name}
                    keySelector={(d) => d.name}
                  />
                </div>
              </div>
              <div className="mt-8">
                <h4 className="text-md font-semibold mb-4">Time Series Chart</h4>
                <div className="h-64 bg-gray-50 rounded border-2 border-dashed border-gray-400 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded flex items-center justify-center">
                      <div className="w-8 h-8 bg-gray-400 rounded"></div>
                    </div>
                    <p className="text-gray-600">Time Series Chart Component</p>
                    <p className="text-sm text-gray-500">This would render a time series chart with data points over time</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tables */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Tables</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dummyTableData.map((row) => (
                      <tr key={row.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.age}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.country}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lists */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Lists</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-semibold mb-4">Basic List</h4>
                  <ul className="space-y-2">
                    {dummyCountries.slice(0, 5).map((country) => (
                      <li key={country.c_code} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{country.label}</span>
                        <span className="text-sm text-gray-500">{country.c_code}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-md font-semibold mb-4">Raw List</h4>
                  <ul className="space-y-1">
                    {dummyCountries.slice(0, 5).map((country) => (
                      <li key={country.c_code} className="text-sm">
                        {country.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Output Components */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Output Components</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-semibold mb-4">Text Output</h4>
                  <TextOutput value="This is some text output" />
                </div>
                <div>
                  <h4 className="text-md font-semibold mb-4">Number Output</h4>
                  <NumberOutput value={1234.56} />
                </div>
                <div>
                  <h4 className="text-md font-semibold mb-4">Date Output</h4>
                  <DateOutput value={new Date()} />
                </div>
                <div>
                  <h4 className="text-md font-semibold mb-4">Boolean Output</h4>
                  <BooleanOutput value={true} />
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* Feedback */}
        <Container heading="Feedback" headingLevel={2} withHeaderBorder withInternalPadding>
          <div className="space-y-6">
            {/* Alerts & Messages */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Alerts & Messages</h3>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckLineIcon className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">This is a success alert message.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertLineIcon className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">This is a warning alert message.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertLineIcon className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">This is an error alert message.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <InfoIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">This is an info alert message.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <InfoIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-800">Information Message</h4>
                      <p className="text-sm text-gray-600 mt-1">This is a message component with a title.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bars */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Progress Bars</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Basic Progress Bar</h4>
                  <ProgressBar value={75} totalValue={100} />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Stacked Progress Bar</h4>
                  <StackedProgressBar
                    data={[
                      { key: 'completed', value: 60, color: '#dc2626' },
                      { key: 'in-progress', value: 25, color: '#f59e0b' },
                      { key: 'pending', value: 15, color: '#6b7280' },
                    ]}
                    valueSelector={(d) => d.value}
                    labelSelector={(d) => d.key}
                    colorSelector={(d) => d.color}
                  />
                </div>
              </div>
            </div>

            {/* Loading States */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Loading States</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Spinner</h4>
                  <Spinner />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Block Loading</h4>
                  <BlockLoading />
                </div>
              </div>
            </div>

            {/* Modals & Popups */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Modals & Popups</h3>
              <div className="space-y-4">
                <Button name="modal" onClick={() => setShowModal(true)}>
                  Open Modal
                </Button>
                <Button name="popup" onClick={() => setShowPopup(true)}>
                  Open Popup
                </Button>
                <Button name="info-popup" onClick={() => {}}>
                  Info Popup
                </Button>
              </div>
            </div>

            {/* Dropdown Menu */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Dropdown Menu</h3>
              <div className="relative inline-block text-left">
                <Button name="dropdown">
                  Actions <ChevronDownLineIcon className="w-4 h-4 ml-2" />
                </Button>
                <div className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <EditLineIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <DeleteBinLineIcon className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <DownloadLineIcon className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* Layout */}
        <Container heading="Layout" headingLevel={2} withHeaderBorder withInternalPadding>
          <div className="space-y-6">
            {/* Grid System */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Grid System</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-100 p-4 rounded">Grid Item 1</div>
                <div className="bg-gray-100 p-4 rounded">Grid Item 2</div>
                <div className="bg-gray-100 p-4 rounded">Grid Item 3</div>
                <div className="bg-gray-100 p-4 rounded">Grid Item 4</div>
                <div className="bg-gray-100 p-4 rounded">Grid Item 5</div>
                <div className="bg-gray-100 p-4 rounded">Grid Item 6</div>
              </div>
            </div>

            {/* Expandable Container */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Expandable Container</h3>
              <div className="border border-gray-200 rounded-lg">
                <button className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Expandable Section</span>
                    <ChevronDownLineIcon className="w-5 h-5 text-gray-500" />
                  </div>
                </button>
                <div className="px-4 py-3 border-t border-gray-200">
                  <p>This is the content inside the expandable container. It can contain any components or text.</p>
                  <div className="mt-4">
                    <Button name="inside-expandable">Button inside expandable</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Tabs</h3>
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
                    Tab 1
                  </button>
                  <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-1 text-sm font-medium">
                    Tab 2
                  </button>
                  <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-1 text-sm font-medium">
                    Tab 3
                  </button>
                </nav>
                <div className="mt-4">
                  <p>Content for tab 1</p>
                </div>
              </div>
            </div>

            {/* Pager */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Pager</h3>
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of <span className="font-medium">97</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        Previous
                      </button>
                      <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        1
                      </button>
                      <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-600 hover:bg-blue-100">
                        2
                      </button>
                      <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        3
                      </button>
                      <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* Maps Section */}
        <Container heading="Maps & Geographic Components" headingLevel={2} withHeaderBorder withInternalPadding>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Map Container</h3>
              <div className="h-64 bg-gray-200 rounded border-2 border-dashed border-gray-400 flex items-center justify-center">
                <div className="text-center">
                  <LocationIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">Map Container Component</p>
                  <p className="text-sm text-gray-500">This would render a map with MapContainer, MapSource, MapLayer components</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Map Popup</h3>
              <div className="bg-white border rounded-lg p-4 shadow-lg max-w-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">Country Name</h4>
                  <Button name="close" variant="tertiary" size={1}>
                    <CloseLineIcon />
                  </Button>
                </div>
                <p className="text-sm text-gray-600">This represents a MapPopup component with country information.</p>
              </div>
            </div>
          </div>
        </Container>

        {/* Modals */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Modal Example</h3>
                <p className="text-sm text-gray-500">This is a modal dialog. It can contain any content.</p>
                <div className="mt-4 flex gap-2">
                  <Button name="modal-close" onClick={() => setShowModal(false)}>
                    Close
                  </Button>
                  <Button name="modal-action" variant="secondary">
                    Action
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPopup && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Popup Example</h3>
                <p className="text-sm text-gray-500">This is a popup. It's similar to a modal but with different styling.</p>
                <div className="mt-4">
                  <Button name="popup-close" onClick={() => setShowPopup(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <Footer>
          <div className="text-center text-gray-600">
            <p>IFRC GO UI Components Demo Page</p>
            <p className="text-sm">Built with IFRC GO Design System</p>
          </div>
        </Footer>
      </div>
    </PageContainer>
  );
}
