import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  constructor() { }

  /**
   * Captures a photo using the device's native camera
   * @returns Promise with the photo data
   */
  async capturePhoto(): Promise<Photo> {
    try {
      // Request camera permissions and capture photo
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        quality: 90,
        allowEditing: false,
        correctOrientation: true
      });

      return photo;
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }

  /**
   * Checks if camera is available
   * @returns Promise with boolean indicating camera availability
   */
  async checkCameraPermissions(): Promise<boolean> {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions.camera === 'granted';
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }

  /**
   * Requests camera permissions
   * @returns Promise with boolean indicating if permission was granted
   */
  async requestCameraPermissions(): Promise<boolean> {
    try {
      const permissions = await Camera.requestPermissions();
      return permissions.camera === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }
}
