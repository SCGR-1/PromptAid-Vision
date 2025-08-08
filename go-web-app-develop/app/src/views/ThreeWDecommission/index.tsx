import ThreeWDecommissionMessage from '#components/domain/ThreeWDecommissionMessage';

interface Props {
    variant?: 'component' | 'page';
}

/** @knipignore */
// eslint-disable-next-line import/prefer-default-export
export function Component(props: Props) {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <ThreeWDecommissionMessage {...props} />;
}

Component.displayName = 'threeWDecommission';
