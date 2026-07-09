import React from 'react';
import { Callout } from '@uniformdev/mesh-sdk-react';
export default function Settings() {
  return (
    <div>
      <Callout type="success">The Contentful integration has been installed successfully.</Callout>
      <p>
        <b>To configure the integration, please follow these steps:</b>
      </p>
      <div>
        <ol className="list-style">
          <li>
            Head to <b>Experience &gt; Data Types</b> in the main navigation above, and create a new data
            source to get started. You can do this by clicking the &apos;Add data type&apos; button on the
            top-right of the page.
          </li>
          <li>
            Once the data source is set-up, you will then be able to create data types to pull in specific
            content from Contentful.
          </li>
        </ol>
      </div>
    </div>
  );
}
