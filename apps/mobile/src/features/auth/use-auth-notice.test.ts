import { createElement, useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_NOTICE_DURATION_MS, useAuthNotice, useRouteAuthNotice } from './use-auth-notice';

const navigation = vi.hoisted(() => ({ focused: true, setParams: vi.fn() }));
vi.mock('expo-router', async () => {
  const React = await import('react');
  return {
    router: { setParams: navigation.setParams },
    useFocusEffect(callback: () => void | (() => void)) {
      React.useEffect(() => navigation.focused ? callback() : undefined, [callback, navigation.focused]);
    },
  };
});

let renderer: ReactTestRenderer | undefined;
let feedback: ReturnType<typeof useAuthNotice<string>>;
let routeFeedback: ReturnType<typeof useRouteAuthNotice>;
function Probe() { feedback = useAuthNotice<string>(); return null; }
function RouteProbe({ value }: { value?: string }) {
  routeFeedback = useRouteAuthNotice('verified', value);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  navigation.focused = true;
  navigation.setParams.mockReset();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('transient auth feedback', () => {
  it('closes after four seconds without another user action', async () => {
    await act(async () => { renderer = create(createElement(Probe)); });
    await act(async () => feedback.setNotice('accepted'));
    expect(feedback.notice).toBe('accepted');
    await act(async () => { vi.advanceTimersByTime(AUTH_NOTICE_DURATION_MS - 1); });
    expect(feedback.notice).toBe('accepted');
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(feedback.notice).toBeNull();
  });
  it('resets the deadline when the same operation succeeds again', async () => {
    await act(async () => { renderer = create(createElement(Probe)); });
    await act(async () => feedback.setNotice('accepted'));
    await act(async () => { vi.advanceTimersByTime(3_000); });
    await act(async () => feedback.setNotice('accepted'));
    await act(async () => { vi.advanceTimersByTime(1_001); });
    expect(feedback.notice).toBe('accepted');
    await act(async () => { vi.advanceTimersByTime(2_999); });
    expect(feedback.notice).toBeNull();
  });
  it('manual dismissal removes the timer and does not clear a later notice', async () => {
    await act(async () => { renderer = create(createElement(Probe)); });
    await act(async () => feedback.setNotice('first'));
    await act(async () => { vi.advanceTimersByTime(2_000); });
    await act(async () => feedback.dismissNotice());
    expect(feedback.notice).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => feedback.setNotice('second'));
    await act(async () => { vi.advanceTimersByTime(2_001); });
    expect(feedback.notice).toBe('second');
  });
  it('does not restart the timer on unrelated rerenders', async () => {
    await act(async () => { renderer = create(createElement(Probe)); });
    await act(async () => feedback.setNotice('accepted'));
    await act(async () => { vi.advanceTimersByTime(3_000); renderer!.update(createElement(Probe)); });
    await act(async () => { vi.advanceTimersByTime(1_000); });
    expect(feedback.notice).toBeNull();
  });
  it('clears on blur, ignores late feedback and does not reappear on return', async () => {
    await act(async () => { renderer = create(createElement(Probe)); });
    await act(async () => feedback.setNotice('accepted'));
    navigation.focused = false;
    await act(async () => renderer!.update(createElement(Probe)));
    expect(feedback.notice).toBeNull();
    await act(async () => feedback.setNotice('late response'));
    expect(feedback.notice).toBeNull();
    navigation.focused = true;
    await act(async () => renderer!.update(createElement(Probe)));
    expect(feedback.notice).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels timers on unmount', async () => {
    await act(async () => { renderer = create(createElement(Probe)); });
    await act(async () => feedback.setNotice('accepted'));
    await act(async () => renderer!.unmount());
    renderer = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('consumes verified=1 once without immediately hiding the message', async () => {
    await act(async () => { renderer = create(createElement(RouteProbe, { value: '1' })); });
    expect(navigation.setParams).toHaveBeenCalledWith({ verified: '0' });
    expect(routeFeedback.visible).toBe(true);
    await act(async () => renderer!.update(createElement(RouteProbe, { value: '0' })));
    expect(routeFeedback.visible).toBe(true);
    await act(async () => { vi.advanceTimersByTime(4_000); });
    expect(routeFeedback.visible).toBe(false);
    await act(async () => renderer!.update(createElement(RouteProbe, { value: '0' })));
    expect(routeFeedback.visible).toBe(false);
    expect(navigation.setParams).toHaveBeenCalledTimes(1);
  });
  it('accepts a new verification event after the previous one was consumed', async () => {
    await act(async () => { renderer = create(createElement(RouteProbe, { value: '1' })); });
    await act(async () => renderer!.update(createElement(RouteProbe, { value: '0' })));
    await act(async () => routeFeedback.dismiss());
    await act(async () => renderer!.update(createElement(RouteProbe, { value: '1' })));
    expect(routeFeedback.visible).toBe(true);
    expect(navigation.setParams).toHaveBeenCalledTimes(2);
  });
});
