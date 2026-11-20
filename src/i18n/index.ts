export type AppLocale = 'en' | 'ru';

export const appLocale: AppLocale =
  typeof navigator !== 'undefined' && navigator.language.startsWith('ru') ? 'ru' : 'en';

export const localeTag = appLocale === 'ru' ? 'ru-RU' : 'en-US';


const T = {
  en: {
    // App
    appName: 'KinCircle Demo',
    appTagline: 'Explore a little closer',
    // Auth tabs
    signIn: 'Sign In',
    register: 'Register',
    // Auth fields
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    emailPlaceholder: 'you@family.com',
    namePlaceholder: 'Your name',
    passwordPlaceholder: 'At least 8 characters',
    // Auth password rules
    passwordRuleLength: 'At least 8 characters',
    passwordRuleUppercase: 'One uppercase letter',
    passwordRuleDigit: 'One digit',
    passwordRuleSpecial: 'One special character',
    // Auth buttons
    signInBtn: 'Sign In',
    requestAccess: 'Request Access',
    // Auth pending
    waitingApproval: 'Waiting for approval',
    waitingApprovalDesc: 'Your registration was submitted. The admin will review and approve your account.',
    backToSignIn: 'Back to Sign In',
    demoHint: 'Demo:',
    // Auth errors
    errInvalidCredentials: 'Invalid email or password.',
    errPendingApproval: 'Your account is awaiting admin approval.',
    errRejected: 'Your registration was not approved.',
    errEmailExists: 'An account with this email already exists.',
    // Admin
    adminTitle: 'User Management',
    back: '\u2190',
    awaitingApproval: 'Awaiting Approval',
    noPendingUsers: 'No pending registrations.',
    approve: 'Approve',
    reject: 'Reject',
    reapprove: 'Re-approve',
    removeAccess: 'Remove',
    approvedMembers: 'Approved Members',
    active: 'Active',
    rejectedSection: 'Rejected',
    noRejectedUsers: 'No rejected users.',
    rejectedBy: 'Removed by',
    unknownAdmin: 'admin',
    restoreUser: 'Restore access',
    newDM: 'New message',
    newGroup: 'New group',
    chats: 'Chats',
    searchChats: 'Search chats\u2026',
    startConversation: 'Start a new conversation',
    allHaveDM: 'All members already have a DM with you.',
    noChatsFound: 'No chats found.',
    admin: 'Admin',
    signOut: '\u21a9 Sign out',
    noMessagesYet: 'No messages yet',
    // Chat
    selectChat: 'Select a chat to start messaging',
    selectChatSub: 'Pick a conversation from the sidebar',
    membersHint: ' members \u2014 click avatar to view',
    online: 'Online',
    offline: 'Offline',
    noMessages: 'No messages yet. Say hello! \ud83d\udc4b',
    members: 'Members',
    you: 'you',
    viewGroupMembers: 'View group members',
    adminPanel: '\u2699\ufe0f Admin Panel',
    profile: 'Profile',
    // Input
    typeMessage: 'Type a message\u2026',
    emojiTitle: 'Emoji',
    attachImageTitle: 'Attach image',
    sendTitle: 'Send',
    // Profile
    chooseAvatar: 'Choose Your Avatar',
    saveChanges: 'Save Changes',
    // Group modal
    newGroupChat: 'New Group Chat',
    groupName: 'Group Name',
    groupNamePlaceholder: 'e.g. Family Reunion',
    addMembers: 'Add Members',
    cancel: 'Cancel',
    createGroup: 'Create Group',
    // Reactions
    removeReaction: 'Remove reaction',
    react: 'React',
    // Wallpaper
    chooseWallpaper: 'Chat Wallpaper',
    wpNone: 'None',
    wpKinCircle: 'Brand',
    wpHearts: 'Hearts',
    wpChatBubbles: 'Chat Bubbles',
    wpStars: 'Stars',
    wpFlowers: 'Flowers',
    wpHome: 'Home',
    wpNetwork: 'Network',
    wpWaves: 'Waves',
    wpDiamonds: 'Diamonds',
    wpConfetti: 'Confetti',
    // Unread / group
    unreadMessages: 'New messages',
    changeGroupPhoto: 'Change group photo',
    noUsersToAdd: 'Everyone is already in this group.',
    renameGroup: 'Rename group',
    removeFromGroup: 'Remove from group',
    deleteGroup: 'Delete group',
    confirmDeleteGroup: 'Delete this group and all its messages?',
    newGroupNamePlaceholder: 'New group name',
    deleteChat: 'Delete conversation',
    confirmDeleteChat: 'Delete this conversation and all its messages?',
    // Other
    sharedImage: 'Shared image',
    downloadImage: 'Save to device',
    imageTooLarge: 'Image is too large (max 10�MB)',
    imageUploadFailed: 'Failed to upload image. Please try again.',
    photo: '\ud83d\udcf7 Photo',
    // Message actions
    editMessage: 'Edit',
    deleteMessage: 'Delete',
    confirmDeleteMessage: 'Delete this message?',
    edited: 'edited',
    saveEdit: 'Save',
    cancelEdit: 'Cancel',
    reply: 'Reply',
    replyingTo: 'Replying to',
    cancelReply: 'Cancel reply',
    // Onboarding
    onboardingTitle: 'Welcome to Family Chat! 👋',
    onboardingSkip: 'Skip',
    onboardingNext: 'Next',
    onboardingDone: 'Get started',
    onboardingStep1Title: 'New message',
    onboardingStep1Desc: 'Tap here to start a private chat with a family member.',
    onboardingStep2Title: 'New group',
    onboardingStep2Desc: 'Tap here to create a group chat — give it a name and choose who to include.',
    onboardingStep3Title: 'Search & find chats',
    onboardingStep3Desc: 'Search your conversations here. Tap any chat to open it, then send text, photos or emoji — long-press a message to react.',
    onboardingStep4Title: 'Your profile',
    onboardingStep4Desc: 'Tap here to update your avatar, display name, or pick a chat wallpaper.',
    // Invite
    inviteSection: 'Invite New Member',
    inviteSectionDesc: 'Generate a one-time link valid for 7 days. Anyone with the link can join directly.',
    generateInviteLink: 'Generate Invite Link',
    inviteCopy: 'Copy',
    inviteCopied: 'Copied!',
    inviteLinkExpiry: 'This link expires in 7 days and can only be used once.',
    inviteError: 'Failed to generate invite. Please try again.',
    inviteTitle: 'You\'re invited to Family Chat!',
    inviteSubtitle: 'Create your account to join the family chat.',
    inviteJoinBtn: 'Join Family Chat',
    inviteInvalid: 'Invitation not found',
    inviteInvalidDesc: 'This invitation link is invalid, has already been used, or has expired.',
    inviteSuccess: 'Account created!',
    inviteSuccessDesc: 'You can now sign in with your email and password.',
    // Photo of the Day gallery
    photosOfDay: 'Photo of the Day',
    photosOfDayNav: 'Gallery',
    photosEmpty: 'No photos yet. Ask an admin to add some memories!',
    photosAddTitle: 'Photo Gallery',
    photosAddSection: 'Add Photo',
    photosAddMemory: 'Add a new memory',
    photosYearsAgo: 'Years ago',
    photosUploadBtn: 'Upload & Add',
    photosAdding: 'Adding…',
    photosDeleteConfirm: 'Remove this photo?',
    photosAddError: 'Failed to add photo. Please try again.',
    photosHighlightTitle: 'Photo of the Day 📸',
    photosHighlightDesc: 'Browse and relive family memories. You can add your own photos too — tap to share a memory!',
    photosHighlightDismiss: 'Got it!',
    // Sakura seasonal event
    sakuraTitle: '🌸 Sakura Season',
    sakuraTooltipDesc: 'Cherry blossoms are blooming! Click the button to enjoy the vibe.',
    sakuraTooltipDismiss: 'Enjoy! 🌸',
    discussInChat: 'Discuss in chat',
    shareToChat: 'Share to chat',
    emailNotifications: 'Email notifications',
    emailNotificationsDesc: 'Receive a daily email summary of unread messages.',
    // Calls
    callAudio: 'Voice call',
    callVideo: 'Video call',
    callIncoming: 'Incoming call…',
    callOutgoing: 'Calling…',
    callDecline: 'Decline',
    callAccept: 'Accept',
    callEnd: 'End call',
    callMute: 'Mute',
    callUnmute: 'Unmute',
    callCameraOff: 'Camera off',
    callCameraOn: 'Camera on',
    callSwitchCamera: 'Switch Camera',
    callSwapVideo: 'Swap View',
    callNoMedia: 'Could not access microphone or camera.',
    callMsgEnded: 'Call ended',
    callMsgMissed: 'Missed call',
    callMsgDeclined: 'Call declined',
    callMsgCancelled: 'Cancelled',
  },
  ru: {
    // App
    appName: 'Семейный чат',
    appTagline: 'Оставайтесь на связи со своей семьёй',
    // Auth tabs
    signIn: 'Войти',
    register: 'Регистрация',
    // Auth fields
    email: 'Электронная почта',
    password: 'Пароль',
    fullName: 'Имя',
    emailPlaceholder: 'вы@почта.ru',
    namePlaceholder: 'Ваше имя',
    passwordPlaceholder: 'Минимум 8 символов',
    // Auth password rules
    passwordRuleLength: 'Минимум 8 символов',
    passwordRuleUppercase: 'Одна заглавная буква',
    passwordRuleDigit: 'Одна цифра',
    passwordRuleSpecial: 'Один спецсимвол',
    // Auth buttons
    signInBtn: 'Войти',
    requestAccess: 'Запросить доступ',
    // Auth pending
    waitingApproval: 'Ожидание подтверждения',
    waitingApprovalDesc: 'Ваша регистрация отправлена. Администратор рассмотрит и одобрит ваш аккаунт.',
    backToSignIn: 'Назад к входу',
    demoHint: 'Демо:',
    // Auth errors
    errInvalidCredentials: 'Неверный email или пароль.',
    errPendingApproval: 'Ваш аккаунт ожидает подтверждения администратора.',
    errRejected: 'Ваша регистрация не была одобрена.',
    errEmailExists: 'Аккаунт с таким email уже существует.',
    // Admin
    adminTitle: 'Управление пользователями',
    back: '←',
    awaitingApproval: 'Ожидают подтверждения',
    noPendingUsers: 'Нет ожидающих регистраций.',
    approve: 'Одобрить',
    reject: 'Отклонить',
    reapprove: 'Одобрить заново',
    removeAccess: 'Удалить',
    approvedMembers: 'Одобренные участники',
    active: 'Активен',
    rejectedSection: 'Отклонённые',
    noRejectedUsers: 'Нет отклонённых пользователей.',
    rejectedBy: 'Удалён администратором',
    unknownAdmin: 'администратор',
    restoreUser: 'Восстановить доступ',
    newDM: 'Новое сообщение',
    newGroup: 'Новая группа',
    chats: 'Чаты',
    searchChats: 'Поиск чатов…',
    startConversation: 'Начать новый разговор',
    allHaveDM: 'У всех участников уже есть чат с вами.',
    noChatsFound: 'Чаты не найдены.',
    admin: 'Администратор',
    signOut: '↩ Выйти',
    noMessagesYet: 'Нет сообщений',
    // Chat
    selectChat: 'Выберите чат для общения',
    selectChatSub: 'Выберите разговор на боковой панели',
    membersHint: ' участников — нажмите на аватар',
    online: 'В сети',
    offline: 'Не в сети',
    noMessages: 'Нет сообщений. Поздоровайтесь! 👋',
    members: 'Участники',
    you: 'вы',
    viewGroupMembers: 'Участники группы',
    adminPanel: 'Администрирование',
    profile: 'Профиль',
    // Input
    typeMessage: 'Введите сообщение…',
    emojiTitle: 'Эмодзи',
    attachImageTitle: 'Прикрепить фото',
    sendTitle: 'Отправить',
    // Profile
    chooseAvatar: 'Выберите аватар',
    saveChanges: 'Сохранить',
    // Group modal
    newGroupChat: 'Новый групповой чат',
    groupName: 'Название группы',
    groupNamePlaceholder: 'напр. День рождения',
    addMembers: 'Добавить участников',
    cancel: 'Отмена',
    createGroup: 'Создать группу',
    // Reactions
    removeReaction: 'Убрать реакцию',
    react: 'Отреагировать',
    // Wallpaper
    chooseWallpaper: 'Обои чата',
    wpNone: 'Нет',
    wpKinCircle: 'Бренд',
    wpHearts: 'Сердечки',
    wpChatBubbles: 'Пузыри чата',
    wpStars: 'Звёзды',
    wpFlowers: 'Цветы',
    wpHome: 'Дом',
    wpNetwork: 'Сеть',
    wpWaves: 'Волны',
    wpDiamonds: 'Ромбы',
    wpConfetti: 'Конфетти',
    // Unread / group
    unreadMessages: 'Новые сообщения',
    changeGroupPhoto: 'Изменить фото группы',
    noUsersToAdd: 'Все уже добавлены в эту группу.',
    renameGroup: 'Переименовать группу',
    removeFromGroup: 'Убрать из группы',
    deleteGroup: 'Удалить группу',
    confirmDeleteGroup: 'Удалить эту группу и все сообщения?',
    newGroupNamePlaceholder: 'Новое название группы',
    deleteChat: 'Удалить переписку',
    confirmDeleteChat: 'Удалить эту переписку и все сообщения?',
    // Other
    sharedImage: 'Изображение',
    downloadImage: 'Сохранить на устройство',
    imageTooLarge: 'Изображение слишком большое (макс. 10 МБ)',
    imageUploadFailed: 'Не удалось загрузить фото. Попробуйте ещё раз.',
    photo: '📷 Фото',
    // Message actions
    editMessage: 'Изменить',
    deleteMessage: 'Удалить',
    confirmDeleteMessage: 'Удалить это сообщение?',
    edited: 'изменено',
    saveEdit: 'Сохранить',
    cancelEdit: 'Отмена',
    reply: 'Ответить',
    replyingTo: 'В ответ на',
    cancelReply: 'Отменить ответ',
    // Onboarding
    onboardingTitle: 'Добро пожаловать! 👋',
    onboardingSkip: 'Пропустить',
    onboardingNext: 'Далее',
    onboardingDone: 'Начать',
    onboardingStep1Title: 'Новое сообщение',
    onboardingStep1Desc: 'Нажмите, чтобы начать личный чат с членом семьи.',
    onboardingStep2Title: 'Новая группа',
    onboardingStep2Desc: 'Нажмите, чтобы создать групповой чат — задайте название и выберите участников.',
    onboardingStep3Title: 'Поиск чатов',
    onboardingStep3Desc: 'Ищите чаты здесь. Нажмите на любой чат, чтобы открыть его — отправляйте текст, фото, эмодзи и реагируйте долгим нажатием.',
    onboardingStep4Title: 'Ваш профиль',
    onboardingStep4Desc: 'Нажмите, чтобы изменить аватар, имя или выбрать обои для чата.',
    // Invite
    inviteSection: 'Пригласить участника',
    inviteSectionDesc: 'Создайте одноразовую ссылку на 7 дней. По ней можно сразу войти без ожидания.',
    generateInviteLink: 'Создать ссылку-приглашение',
    inviteCopy: 'Копировать',
    inviteCopied: 'Скопировано!',
    inviteLinkExpiry: 'Ссылка действует 7 дней и может быть использована только один раз.',
    inviteError: 'Не удалось создать приглашение. Попробуйте ещё раз.',
    inviteTitle: 'Вас приглашают в Семейный чат!',
    inviteSubtitle: 'Создайте аккаунт, чтобы присоединиться к семейному чату.',
    inviteJoinBtn: 'Присоединиться',
    inviteInvalid: 'Приглашение не найдено',
    inviteInvalidDesc: 'Эта ссылка недействительна, уже была использована или истёк срок действия.',
    inviteSuccess: 'Аккаунт создан!',
    inviteSuccessDesc: 'Теперь вы можете войти с помощью email и пароля.',
    // Photo of the Day gallery
    photosOfDay: 'Фото дня',
    photosOfDayNav: 'Галерея',
    photosEmpty: 'Фотографий пока нет. Попросите администратора добавить воспоминания!',
    photosAddTitle: 'Фотогалерея',
    photosAddSection: 'Добавить фото',
    photosAddMemory: 'Добавить воспоминание',
    photosYearsAgo: 'Лет назад',
    photosUploadBtn: 'Загрузить и добавить',
    photosAdding: 'Добавление…',
    photosDeleteConfirm: 'Удалить это фото?',
    photosAddError: 'Не удалось добавить фото. Попробуйте ещё раз.',
    photosHighlightTitle: 'Фото дня 📸',
    photosHighlightDesc: 'Просматривайте семейные воспоминания. Вы тоже можете добавлять свои фото — нажмите, чтобы поделиться воспоминанием!',
    photosHighlightDismiss: 'Понятно!',
    // Sakura seasonal event
    sakuraTitle: '🌸 Сезон сакуры',
    sakuraTooltipDesc: 'Цветёт сакура! Нажмите кнопку, чтобы почувствовать атмосферу.',
    sakuraTooltipDismiss: 'Наслаждаться! 🌸',
    discussInChat: 'Обсудить в чате',
    shareToChat: 'Поделиться в чате',
    emailNotifications: 'Email-уведомления',
    emailNotificationsDesc: 'Получать ежедневную сводку непрочитанных сообщений на email.',
    // Calls
    callAudio: 'Голосовой звонок',
    callVideo: 'Видеозвонок',
    callIncoming: 'Входящий звонок…',
    callOutgoing: 'Звоним…',
    callDecline: 'Отклонить',
    callAccept: 'Принять',
    callEnd: 'Завершить',
    callMute: 'Без звука',
    callUnmute: 'Включить звук',
    callCameraOff: 'Выкл. камеру',
    callCameraOn: 'Вкл. камеру',
    callSwitchCamera: 'Сменить камеру',
    callSwapVideo: 'Поменять вид',
    callNoMedia: 'Нет доступа к микрофону или камере.',
    callMsgEnded: 'Звонок завершён',
    callMsgMissed: 'Пропущенный звонок',
    callMsgDeclined: 'Звонок отклонён',
    callMsgCancelled: 'Отменён',
  },
} as const;

type Key = keyof typeof T.en;

export function t(key: Key): string {
  return ((T[appLocale] as typeof T.en)[key] ?? T.en[key]) as string;
}

export function formatYearsAgo(n: number): string {
  if (appLocale === 'ru') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    let form: string;
    if (mod100 >= 11 && mod100 <= 14) form = 'лет';
    else if (mod10 === 1) form = 'год';
    else if (mod10 >= 2 && mod10 <= 4) form = 'года';
    else form = 'лет';
    return `Этот день ${n} ${form} назад`;
  }
  return `This day ${n} year${n === 1 ? '' : 's'} ago`;
}

export function formatMessageTime(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatLastSeen(iso: string | undefined): string {
  if (!iso) return t('offline');

  const date = new Date(iso);
  const now = new Date();

  // Compare calendar days (ignore time-of-day)
  const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((dayOf(now) - dayOf(date)) / 86_400_000);

  const timeStr = date.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) {
    return appLocale === 'ru'
      ? `был(а) сегодня в ${timeStr}`
      : `last seen today at ${timeStr}`;
  }
  if (diffDays === 1) {
    return appLocale === 'ru'
      ? `был(а) вчера в ${timeStr}`
      : `last seen yesterday at ${timeStr}`;
  }
  if (diffDays < 7) {
    return appLocale === 'ru'
      ? `был(а) ${diffDays} дн. назад`
      : `last seen ${diffDays} days ago`;
  }
  const dateStr = date.toLocaleDateString(localeTag, { day: 'numeric', month: 'short' });
  return appLocale === 'ru'
    ? `был(а) ${dateStr}`
    : `last seen ${dateStr}`;
}
