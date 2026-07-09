import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  DataSourceLocationValue,
  Switch,
  useMeshLocation,
  ValidationResult,
} from '@uniformdev/mesh-sdk-react';
import { Input, TabButton, TabButtonGroup, TabContent, Tabs } from '@uniformdev/design-system';
import {
  BASE_URL,
  DEFAULT_ENVIRONMENT,
  PREVIEW_BASE_URL,
  TRUE_VALIDATION_RESULT,
  VALIDATION_MESSAGES,
} from '../constants';
import { ConfigParams } from '../types/mesh';

function validate(
  { parameters, custom, customPublic }: DataSourceLocationValue,
  enableUnpublishedMode?: boolean
): ValidationResult {
  const deliveryToken = parameters?.find(({ key }) => key === 'access_token')?.value;
  const spaceId = custom?.spaceId;

  if (!spaceId) {
    return {
      isValid: false,
      validationMessage: VALIDATION_MESSAGES.SPACE_ID_REQUIRED,
    };
  } else if (!deliveryToken) {
    return {
      isValid: false,
      validationMessage: VALIDATION_MESSAGES.DELIVERY_TOKEN_REQUIRED,
    };
  } else if (enableUnpublishedMode) {
    const previewToken = custom?.previewToken;
    const previewEnvironmentId = customPublic?.previewEnvironmentId;

    if (!previewToken && !previewEnvironmentId) {
      return {
        isValid: false,
        validationMessage: VALIDATION_MESSAGES.UNPUBLISHED_CONFIGURATION_REQUIRED,
      };
    }
  }

  return TRUE_VALIDATION_RESULT;
}

const DataConnectionEditor: FC = () => {
  const {
    value: meshLocationValue,
    setValue: setMeshLocationValue,
    metadata: { enableUnpublishedMode },
  } = useMeshLocation<'dataSource'>();
  const { custom, customPublic = {} } = meshLocationValue;

  const parsedSpaceId = custom?.spaceId ? String(custom.spaceId) : '';
  const parsedEnvironmentId = custom?.environmentId ? String(custom.environmentId) : '';
  const parsedDeliveryToken = custom?.deliveryToken ? String(custom.deliveryToken) : '';
  const parsedPreviewToken = custom?.previewToken ? String(custom.previewToken) : '';
  const parsedContentManagementToken = custom?.contentManagementToken
    ? String(custom.contentManagementToken)
    : '';
  const parsedPreviewEnvironmentId = customPublic?.previewEnvironmentId
    ? String(customPublic.previewEnvironmentId)
    : '';
  const [enablePreviewApi, setEnablePreviewApi] = useState(Boolean(parsedPreviewToken));

  const [credentials, setCredentials] = useState<ConfigParams>(() => ({
    spaceId: parsedSpaceId,
    environmentId: parsedEnvironmentId,
    deliveryToken: parsedDeliveryToken,
    previewToken: parsedPreviewToken,
    contentManagementToken: parsedContentManagementToken,
    previewEnvironmentId: parsedPreviewEnvironmentId,
  }));

  const {
    spaceId,
    environmentId,
    deliveryToken,
    previewToken,
    contentManagementToken,
    previewEnvironmentId,
  } = credentials;

  const hasNewValue = useMemo(
    () =>
      parsedSpaceId !== spaceId ||
      parsedEnvironmentId !== environmentId ||
      parsedDeliveryToken !== deliveryToken ||
      parsedPreviewToken !== previewToken ||
      parsedContentManagementToken !== contentManagementToken ||
      parsedPreviewEnvironmentId !== previewEnvironmentId,
    [
      deliveryToken,
      environmentId,
      spaceId,
      parsedDeliveryToken,
      parsedEnvironmentId,
      parsedSpaceId,
      previewToken,
      contentManagementToken,
      previewEnvironmentId,
      parsedPreviewToken,
      parsedContentManagementToken,
      parsedPreviewEnvironmentId,
    ]
  );

  useEffect(() => {
    if (hasNewValue) {
      setMeshLocationValue(() => {
        const newValue = {
          baseUrl: `${BASE_URL}/spaces/${spaceId}/environments/${environmentId || DEFAULT_ENVIRONMENT}`,
          headers: [{ key: 'Content-Type', value: 'application/json' }],
          parameters: [{ key: 'access_token', value: deliveryToken }],
          custom: {
            spaceId,
            environmentId: environmentId || DEFAULT_ENVIRONMENT,
            deliveryToken,
            previewToken,
            contentManagementToken,
          },
          customPublic: {
            previewEnvironmentId,
          },
          ...(enableUnpublishedMode
            ? {
                variants: {
                  unpublished: {
                    baseUrl: `${previewToken ? PREVIEW_BASE_URL : BASE_URL}/spaces/${spaceId}/environments/${
                      previewEnvironmentId || environmentId || DEFAULT_ENVIRONMENT
                    }`,
                    headers: [{ key: 'Content-Type', value: 'application/json' }],
                    // in case when we do not specify preview token but only Preview Environment ID we still need delivery token
                    parameters: [{ key: 'access_token', value: previewToken || deliveryToken }],
                  },
                },
              }
            : {}),
        };

        return { newValue, options: validate(newValue, enableUnpublishedMode) };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    deliveryToken,
    environmentId,
    hasNewValue,
    spaceId,
    previewToken,
    contentManagementToken,
    previewEnvironmentId,
  ]);

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCredentials((prevState) => ({ ...prevState, [name]: value }));
  };

  if (!enableUnpublishedMode) {
    return (
      <div className="contentful-container">
        <Input
          id="spaceId"
          name="spaceId"
          label="Space ID"
          placeholder="Provide your Space ID here"
          value={credentials.spaceId}
          onChange={handleLoginInputChange}
        />
        <Input
          id="deliveryToken"
          name="deliveryToken"
          label="Content Delivery API (CDA) Access Token"
          type="password"
          placeholder="Provide your CDA Token here"
          value={credentials.deliveryToken}
          onChange={handleLoginInputChange}
        />
        <Input
          id="environmentId"
          name="environmentId"
          label="Environment ID (Optional)"
          placeholder="Provide your Environment ID here"
          value={credentials.environmentId}
          onChange={handleLoginInputChange}
          caption="Default value - master"
        />
      </div>
    );
  }

  return (
    <div className="contentful-container">
      <Tabs>
        <TabButtonGroup aria-label="Data Source editor form with alternatives if available">
          <TabButton id="standard">Standard</TabButton>
          <TabButton id="unpublished">Unpublished data</TabButton>
        </TabButtonGroup>
        <TabContent id="standard">
          <Input
            id="spaceId"
            name="spaceId"
            label="Space ID"
            placeholder="Provide your Space ID here"
            value={credentials.spaceId}
            onChange={handleLoginInputChange}
          />
          <Input
            id="deliveryToken"
            name="deliveryToken"
            label="Content Delivery API (CDA) Access Token"
            type="password"
            placeholder="Provide your CDA Token here"
            value={credentials.deliveryToken}
            onChange={handleLoginInputChange}
          />
          <Input
            id="environmentId"
            name="environmentId"
            label="Environment ID (Optional)"
            placeholder="Provide your Environment ID here"
            value={credentials.environmentId}
            onChange={handleLoginInputChange}
            caption="Default value - master"
          />
        </TabContent>
        <TabContent id="unpublished">
          <Switch
            label="Use Contentful Preview API"
            infoText="It will allow to fetch unpublished and modified content for preview purposes"
            checked={enablePreviewApi}
            onChange={(e) => {
              setEnablePreviewApi(e.target.checked);
              if (!e.target.checked) {
                setCredentials((prevState) => ({
                  ...prevState,
                  previewToken: '',
                  contentManagementToken: '',
                }));
              }
            }}
          />
          {enablePreviewApi ? (
            <>
              <Input
                id="previewToken"
                name="previewToken"
                label="Content Preview API (CPA) Access Token (Optional)"
                type="password"
                placeholder="Provide your Preview CDA Token here"
                value={credentials.previewToken}
                onChange={handleLoginInputChange}
              />
              <Input
                id="contentManagementToken"
                name="contentManagementToken"
                label="Content Management Token (Optional)"
                placeholder="Provide your CMA Token here"
                type="password"
                value={credentials.contentManagementToken}
                onChange={handleLoginInputChange}
                caption="Here is documentation on how to create a Content Management Token with only required read-only access for content."
              />
            </>
          ) : null}
          <Input
            id="previewEnvironmentId"
            name="previewEnvironmentId"
            label="Preview Environment ID"
            placeholder="Provide your Preview Environment ID here"
            caption="Works independently of Preview API. if specified, for 'Unpublished' data we will use this evironment instead of Environment ID from standard settings. If Preview Token is speficied we will fetch both unpublished content and from speficied priview environment."
            value={credentials.previewEnvironmentId}
            onChange={handleLoginInputChange}
          />
        </TabContent>
      </Tabs>
    </div>
  );
};

export default DataConnectionEditor;
