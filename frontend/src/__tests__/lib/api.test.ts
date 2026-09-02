import { api, ApiError } from '@/lib/api';

function mockFetchOnce(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as jest.Mock;
}

describe('api client', () => {
  afterEach(() => { jest.resetAllMocks(); });

  it('sends credentials and a JSON content-type header on every request', async () => {
    mockFetchOnce(200, { id: 1, username: 'alice', avatarUrl: null });
    await api.me();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/me'),
      expect.objectContaining({ credentials: 'include', headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    );
  });

  it('throws an ApiError carrying the backend message on a failed request', async () => {
    mockFetchOnce(409, { message: "Ce nom d'utilisateur est déjà pris" });
    await expect(api.signup('alice', 'password123')).rejects.toMatchObject({ status: 409, message: "Ce nom d'utilisateur est déjà pris" });
  });

  it('throws a generic ApiError if the failed response has no parseable body', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('not json'); } }) as jest.Mock;
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
  });

  it('resolves to undefined on a 204 No Content response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('nope'); } }) as jest.Mock;
    await expect(api.deleteServer(1)).resolves.toBeUndefined();
  });

  it('builds the join-server URL using the invite code', async () => {
    mockFetchOnce(200, { id: 1, name: 'Test', inviteCode: 'abc123', createdAt: '' });
    await api.joinServer('abc123');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers/abc123/join'), expect.objectContaining({ method: 'POST' }));
  });

  it('calls signup, login, logout endpoints correctly', async () => {
    mockFetchOnce(201, { id: 1, username: 'bob', avatarUrl: null });
    await api.signup('bob', 'password123');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/signup'), expect.objectContaining({ method: 'POST' }));

    mockFetchOnce(200, { id: 1, username: 'bob', avatarUrl: null });
    await api.login('bob', 'password123');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/login'), expect.objectContaining({ method: 'POST' }));

    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('n/a'); } }) as jest.Mock;
    await api.logout();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), expect.objectContaining({ method: 'POST' }));
  });

  it('calls server CRUD endpoints correctly', async () => {
    mockFetchOnce(200, []);
    await api.listServers();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers'), expect.any(Object));

    mockFetchOnce(201, { id: 1, name: 'S', inviteCode: 'c', createdAt: '' });
    await api.createServer('S');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers'), expect.objectContaining({ method: 'POST' }));

    mockFetchOnce(200, { id: 1, name: 'S', inviteCode: 'c', createdAt: '' });
    await api.getServer(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers/1'), expect.any(Object));

    mockFetchOnce(200, { id: 1, name: 'S2', inviteCode: 'c', createdAt: '' });
    await api.updateServer(1, 'S2');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers/1'), expect.objectContaining({ method: 'PUT' }));

    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('n/a'); } }) as jest.Mock;
    await api.deleteServer(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers/1'), expect.objectContaining({ method: 'DELETE' }));

    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('n/a'); } }) as jest.Mock;
    await api.leaveServer(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers/1/leave'), expect.objectContaining({ method: 'DELETE' }));

    mockFetchOnce(200, []);
    await api.listMembers(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers/1/members'), expect.any(Object));

    mockFetchOnce(200, { serverId: 1, userId: 2, role: 'admin', joinedAt: '' });
    await api.updateMemberRole(1, 2, 'admin');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers/1/members/2'), expect.objectContaining({ method: 'PUT' }));
  });

  it('calls channel CRUD endpoints correctly', async () => {
    mockFetchOnce(200, []);
    await api.listChannels(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers/1/channels'), expect.any(Object));

    mockFetchOnce(201, { id: 1, serverId: 1, name: 'general', createdAt: '' });
    await api.createChannel(1, 'general');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/servers/1/channels'), expect.objectContaining({ method: 'POST' }));

    mockFetchOnce(200, { id: 1, serverId: 1, name: 'general2', createdAt: '' });
    await api.updateChannel(1, 'general2');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/channels/1'), expect.objectContaining({ method: 'PUT' }));

    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('n/a'); } }) as jest.Mock;
    await api.deleteChannel(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/channels/1'), expect.objectContaining({ method: 'DELETE' }));
  });

  it('calls message CRUD endpoints correctly', async () => {
    mockFetchOnce(200, []);
    await api.listMessages(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/channels/1/messages'), expect.any(Object));

    mockFetchOnce(201, { id: 1, channelId: 1, authorId: 1, content: 'hi', createdAt: '' });
    await api.sendMessage(1, 'hi');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/channels/1/messages'), expect.objectContaining({ method: 'POST' }));

    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('n/a'); } }) as jest.Mock;
    await api.deleteMessage(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/messages/1'), expect.objectContaining({ method: 'DELETE' }));
  });
});
