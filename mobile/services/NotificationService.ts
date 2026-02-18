import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import { toast } from '../components/Toast';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  /**
   * Request permissions for push notifications
   */
  async requestPermissions() {
    if (Platform.OS === 'web') return false;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  /**
   * Notify user of new items (intelligent routing)
   */
  async notifyNewTodos(count: number) {
    const title = 'New Tasks Found';
    const message = `I've automatically extracted ${count} new task${count > 1 ? 's' : ''} from your emails.`;

    if (AppState.currentState === 'active') {
      // App is in foreground: use Toast
      toast.show(message, 'info');
    } else {
      // App is in background: use Push Notification
      await this.showPushNotification(title, message);
    }
  }

  /**
   * Show a local push notification
   */
  private async showPushNotification(title: string, body: string) {
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });
  }
}

export default new NotificationService();
