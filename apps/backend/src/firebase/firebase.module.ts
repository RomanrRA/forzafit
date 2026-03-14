import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Global()
@Module({})
export class FirebaseModule implements OnModuleInit {
  private readonly logger = new Logger(FirebaseModule.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length > 0) return;

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.config
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn(
        'Firebase credentials not configured — Firebase Auth will not work',
      );
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
    });

    this.logger.log('Firebase Admin SDK initialized');
  }
}
