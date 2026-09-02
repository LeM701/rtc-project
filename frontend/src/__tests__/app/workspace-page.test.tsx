import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChannelPage from '@/app/servers/[serverId]/channels/[channelId]/page';
import { createFakeSocket } from '../../testUtils/fakeSocket';

jest.mock('@/components/RequireAuth', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRouter = { replace: mockReplace, push: mockPush };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ serverId: '1', channelId: '10' }),
}));

jest.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 1, username: 'alice', avatarUrl: null } }),
}));

const fakeSocket = createFakeSocket();
jest.mock('@/lib/socket', () => ({ getSocket: () => fakeSocket }));

const mockListServers = jest.fn();
const mockGetServer = jest.fn();
const mockListChannels = jest.fn();
const mockListMembers = jest.fn();
const mockListMessages = jest.fn();
const mockSendMessage = jest.fn();
const mockDeleteMessage = jest.fn();
const mockCreateChannel = jest.fn();
const mockDeleteChannel = jest.fn();
const mockUpdateMemberRole = jest.fn();
const mockDeleteServer = jest.fn();
const mockLeaveServer = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    listServers: () => mockListServers(),
    getServer: (...a: unknown[]) => mockGetServer(...a),
    listChannels: (...a: unknown[]) => mockListChannels(...a),
    listMembers: (...a: unknown[]) => mockListMembers(...a),
    listMessages: (...a: unknown[]) => mockListMessages(...a),
    sendMessage: (...a: unknown[]) => mockSendMessage(...a),
    deleteMessage: (...a: unknown[]) => mockDeleteMessage(...a),
    createChannel: (...a: unknown[]) => mockCreateChannel(...a),
    deleteChannel: (...a: unknown[]) => mockDeleteChannel(...a),
    updateMemberRole: (...a: unknown[]) => mockUpdateMemberRole(...a),
    deleteServer: (...a: unknown[]) => mockDeleteServer(...a),
    leaveServer: (...a: unknown[]) => mockLeaveServer(...a),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));

const baseServer = { id: 1, name: 'Epitech Promo', inviteCode: 'abc', createdAt: '' };
const baseChannel = { id: 10, serverId: 1, name: 'general', createdAt: '' };
const secondChannel = { id: 11, serverId: 1, name: 'random', createdAt: '' };
const baseMembers = [
  { serverId: 1, userId: 1, username: 'alice', role: 'owner', joinedAt: '' },
  { serverId: 1, userId: 2, username: 'bob', role: 'member', joinedAt: '' },
];

function mockHappyPath(overrides: Partial<{ messages: any[]; channels: any[]; myRole: string }> = {}) {
  mockListServers.mockResolvedValue([{ ...baseServer, myRole: overrides.myRole ?? 'owner' }]);
  mockGetServer.mockResolvedValue(baseServer);
  mockListChannels.mockResolvedValue(overrides.channels ?? [baseChannel]);
  mockListMembers.mockResolvedValue(baseMembers);
  mockListMessages.mockResolvedValue(overrides.messages ?? []);
}

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
});

describe('Workspace (channel page) — full integration', () => {
  afterEach(() => { jest.clearAllMocks(); });

  it('loads and renders server, channel, and members (exercises ServerRail, ChannelSidebar, MembersPanel)', async () => {
    mockHappyPath();
    render(<ChannelPage />);
    expect(await screen.findByText('Epitech Promo')).toBeInTheDocument();
    expect(screen.getAllByText('general')).toHaveLength(2);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByTitle('Epitech Promo')).toBeInTheDocument();
  });

  it('sends a message through the API when submitting the chat input (ChatPanel)', async () => {
    mockHappyPath();
    mockSendMessage.mockResolvedValue({ id: 1, channelId: 10, authorId: 1, content: 'hello', createdAt: '' });
    render(<ChannelPage />);
    const input = await screen.findByPlaceholderText('Écrire dans #general');
    await userEvent.type(input, 'hello{Enter}');
    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledWith(10, 'hello'));
  });

  it('shows an error alert if sending a message fails', async () => {
    mockHappyPath();
    mockSendMessage.mockRejectedValue(new Error('network down'));
    window.alert = jest.fn();
    render(<ChannelPage />);
    const input = await screen.findByPlaceholderText('Écrire dans #general');
    await userEvent.type(input, 'hello{Enter}');
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });

  it('appends a message received over the socket, for the active channel', async () => {
    mockHappyPath();
    render(<ChannelPage />);
    await screen.findByPlaceholderText('Écrire dans #general');
    fakeSocket.__trigger('message:new', { id: 99, channelId: 10, authorId: 1, content: 'pushed via socket', createdAt: new Date().toISOString() });
    expect(await screen.findByText('pushed via socket')).toBeInTheDocument();
  });

  it('ignores a socket message meant for a different channel', async () => {
    mockHappyPath();
    render(<ChannelPage />);
    await screen.findByPlaceholderText('Écrire dans #general');
    fakeSocket.__trigger('message:new', { id: 99, channelId: 999, authorId: 1, content: 'should not appear', createdAt: new Date().toISOString() });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('should not appear')).not.toBeInTheDocument();
  });

  it('removes a message when a message:deleted event arrives for the active channel', async () => {
    mockHappyPath({ messages: [{ id: 5, channelId: 10, authorId: 1, content: 'to be removed', createdAt: '' }] });
    render(<ChannelPage />);
    expect(await screen.findByText('to be removed')).toBeInTheDocument();
    fakeSocket.__trigger('message:deleted', { channelId: 10, messageId: 5 });
    await waitFor(() => expect(screen.queryByText('to be removed')).not.toBeInTheDocument());
  });

  it('shows the typing indicator when a typing:update event arrives for another user', async () => {
    mockHappyPath();
    render(<ChannelPage />);
    await screen.findByPlaceholderText('Écrire dans #general');
    fakeSocket.__trigger('typing:update', { channelId: 10, userId: 2, username: 'bob', isTyping: true });
    expect(await screen.findByText(/bob est en train d'écrire/i)).toBeInTheDocument();
  });

  it('updates the online presence dots when a presence:update event arrives', async () => {
    mockHappyPath();
    render(<ChannelPage />);
    await screen.findByText('alice');
    fakeSocket.__trigger('presence:update', { serverId: 1, onlineUserIds: [1] });
    await waitFor(() => { expect(document.querySelector('span.bg-online')).not.toBeNull(); });
  });

  it('deletes a message through the API when the delete button is clicked (own message)', async () => {
    mockHappyPath({ messages: [{ id: 5, channelId: 10, authorId: 1, content: 'delete me', createdAt: '' }] });
    mockDeleteMessage.mockResolvedValue(undefined);
    render(<ChannelPage />);
    await screen.findByText('delete me');
    await userEvent.click(screen.getByText('Supprimer'));
    expect(mockDeleteMessage).toHaveBeenCalledWith(5);
  });

  it('hides the delete button for a Member viewing someone else\'s message', async () => {
    mockHappyPath({ myRole: 'member', messages: [{ id: 5, channelId: 10, authorId: 99, content: 'not mine', createdAt: '' }] });
    render(<ChannelPage />);
    await screen.findByText('not mine');
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument();
  });

  it('shows the create-channel button for the Owner and creates a channel (ChannelSidebar)', async () => {
    mockHappyPath();
    mockCreateChannel.mockResolvedValue({ id: 12, serverId: 1, name: 'new-channel', createdAt: '' });
    render(<ChannelPage />);
    const createBtn = await screen.findByTitle('Créer un channel');
    await userEvent.click(createBtn);
    const input = screen.getByPlaceholderText('nom-du-channel');
    await userEvent.type(input, 'new-channel{Enter}');
    await waitFor(() => expect(mockCreateChannel).toHaveBeenCalledWith(1, 'new-channel'));
  });

  it('hides the create-channel button for a plain Member', async () => {
    mockHappyPath({ myRole: 'member' });
    render(<ChannelPage />);
    await screen.findByPlaceholderText('Écrire dans #general');
    expect(screen.queryByTitle('Créer un channel')).not.toBeInTheDocument();
  });

  it('deletes a channel via the sidebar (ChannelSidebar)', async () => {
    mockHappyPath({ channels: [baseChannel, secondChannel] });
    mockDeleteChannel.mockResolvedValue(undefined);
    window.confirm = jest.fn(() => true);
    render(<ChannelPage />);
    await screen.findByPlaceholderText('Écrire dans #general');
    const deleteButtons = screen.getAllByTitle('Supprimer le channel');
    await userEvent.click(deleteButtons[0]);
    await waitFor(() => expect(mockDeleteChannel).toHaveBeenCalled());
  });

  it('copies the invite code when clicking the copy link', async () => {
    mockHappyPath();
    render(<ChannelPage />);
    await userEvent.click(await screen.findByText("Copier le code d'invitation"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abc');
  });

  it('lets the Owner change a member role (MembersPanel)', async () => {
    mockHappyPath();
    mockUpdateMemberRole.mockResolvedValue({ serverId: 1, userId: 2, role: 'admin', joinedAt: '' });
    render(<ChannelPage />);
    const select = await screen.findByDisplayValue('Member');
    await userEvent.selectOptions(select, 'admin');
    await waitFor(() => expect(mockUpdateMemberRole).toHaveBeenCalledWith(1, 2, 'admin'));
  });

  it('refetches members and servers after a role change', async () => {
    mockHappyPath();
    mockUpdateMemberRole.mockResolvedValue({ serverId: 1, userId: 2, role: 'admin', joinedAt: '' });
    render(<ChannelPage />);
    const select = await screen.findByDisplayValue('Member');
    await userEvent.selectOptions(select, 'admin');
    await waitFor(() => expect(mockListMembers).toHaveBeenCalledTimes(2));
  });

  it('deletes the server when the Owner confirms', async () => {
    mockHappyPath();
    mockDeleteServer.mockResolvedValue(undefined);
    window.confirm = jest.fn(() => true);
    render(<ChannelPage />);
    await userEvent.click(await screen.findByText('Supprimer le serveur'));
    await waitFor(() => expect(mockDeleteServer).toHaveBeenCalledWith(1));
    expect(mockPush).toHaveBeenCalledWith('/servers');
  });

  it('lets a Member leave the server', async () => {
    mockHappyPath({ myRole: 'member' });
    mockLeaveServer.mockResolvedValue(undefined);
    window.confirm = jest.fn(() => true);
    render(<ChannelPage />);
    await userEvent.click(await screen.findByText('Quitter le serveur'));
    await waitFor(() => expect(mockLeaveServer).toHaveBeenCalledWith(1));
  });

  it('redirects to the dashboard if the initial data load fails', async () => {
    mockListServers.mockRejectedValue(new Error('404'));
    mockGetServer.mockRejectedValue(new Error('404'));
    mockListChannels.mockRejectedValue(new Error('404'));
    mockListMembers.mockRejectedValue(new Error('404'));
    render(<ChannelPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/servers'));
  });

  it('shows an empty state when there are no messages yet', async () => {
    mockHappyPath({ messages: [] });
    render(<ChannelPage />);
    expect(await screen.findByText(/aucun message/i)).toBeInTheDocument();
  });
});
