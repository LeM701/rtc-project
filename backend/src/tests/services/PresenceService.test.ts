import { PresenceService } from '../../services/PresenceService';

describe('PresenceService', () => {
  it('shows a user online in a server after joining it', () => {
    const presence = new PresenceService();
    presence.registerConnection(1);
    presence.addToServer(1, 100);

    expect(presence.getOnlineUserIds(100)).toEqual([1]);
  });

  it('keeps a user online while they still have another open tab/connection', () => {
    const presence = new PresenceService();
    presence.registerConnection(1); // tab 1
    presence.registerConnection(1); // tab 2
    presence.addToServer(1, 100);

    const stillHasConnections = presence.unregisterConnection(1); // close tab 1
    expect(stillHasConnections).toBe(false);
    expect(presence.getOnlineUserIds(100)).toEqual([1]);
  });

  it('marks a user fully offline once their last connection closes', () => {
    const presence = new PresenceService();
    presence.registerConnection(1);
    presence.addToServer(1, 100);

    const wentOffline = presence.unregisterConnection(1);
    expect(wentOffline).toBe(true);
  });

  it('removes a user from every server they were present in on full disconnect', () => {
    const presence = new PresenceService();
    presence.registerConnection(1);
    presence.addToServer(1, 100);
    presence.addToServer(1, 200);

    const affectedServers = presence.removeFromAllServers(1);
    expect(affectedServers.sort()).toEqual([100, 200]);
    expect(presence.getOnlineUserIds(100)).toEqual([]);
    expect(presence.getOnlineUserIds(200)).toEqual([]);
  });

  it('does not affect other users presence', () => {
    const presence = new PresenceService();
    presence.registerConnection(1);
    presence.registerConnection(2);
    presence.addToServer(1, 100);
    presence.addToServer(2, 100);

    presence.removeFromAllServers(1);
    expect(presence.getOnlineUserIds(100)).toEqual([2]);
  });
});
