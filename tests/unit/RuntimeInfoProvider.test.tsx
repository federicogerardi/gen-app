import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuntimeInfoProvider, useRuntimeInfo } from '@/components/layout/RuntimeInfoProvider';

function RuntimeConsumer() {
  const info = useRuntimeInfo();
  return <span>{`${info.channelLabel} • ${info.versionLabel}`}</span>;
}

describe('RuntimeInfoProvider', () => {
  it('provides runtime info through context', () => {
    render(
      <RuntimeInfoProvider
        value={{
          channel: 'preview',
          channelLabel: 'PREVIEW',
          appVersion: '1.4.0-rc.1',
          versionLabel: 'v1.4.0-rc.1',
          isNonProduction: true,
        }}
      >
        <RuntimeConsumer />
      </RuntimeInfoProvider>,
    );

    expect(screen.getByText('PREVIEW • v1.4.0-rc.1')).toBeInTheDocument();
  });

  it('throws when useRuntimeInfo is called outside provider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<RuntimeConsumer />)).toThrow('useRuntimeInfo must be used within RuntimeInfoProvider.');

    consoleErrorSpy.mockRestore();
  });
});