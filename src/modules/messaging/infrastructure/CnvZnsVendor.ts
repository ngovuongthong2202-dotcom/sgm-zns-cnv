import { znsPayloadBuilder } from '../../../backend/services/zns/zns-payload.builder';
import { validateAndGetVendorUrl, parseVendorResponse, handlePreflightBlocked } from '../../../backend/services/zns/outbound-helpers';
import { adminDb } from '../../../backend/config/supabase.admin';
import { ZnsMessageAggregate } from '../domain/ZnsMessage';
import { ZnsVendorPort } from '../domain/ZnsVendorPort';
import { logger } from '../../../shared/lib/logger';

export class CnvZnsVendor implements ZnsVendorPort {
  async send(message: ZnsMessageAggregate): Promise<{ trackingId: string; success: boolean; rawResponse: any; error?: string }> {
    const props = message.props;
    
    let url: string;
    try {
      const settingsDocRef = adminDb.collection('settings').doc('zns_config');
      const settingsDoc = await settingsDocRef.get();
      const configData = settingsDoc.exists ? settingsDoc.data() || {} : {};
      url = await validateAndGetVendorUrl(props, configData);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZnsConfigurationError') {
        throw err;
      }
      throw new Error(`Failed to resolve vendor URL: ${err}`, { cause: err });
    }

    let payload: Record<string, unknown>;
    try {
      payload = await znsPayloadBuilder.buildPayload(props as any, message.id, { strictMode: false });
    } catch (err: any) {
      if (err.code === 'ZALO_REQUIRED_VARS_EMPTY' || err.code === 'TEMPLATE_VARIABLES_MISSING') {
         await handlePreflightBlocked(props as any, err.message, err.missing || []);
         return { trackingId: '', success: false, rawResponse: null, error: err.message };
      }
      throw err;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const text = await response.text();
      let responseBody: any = null;
      try {
        responseBody = JSON.parse(text);
      } catch (e) {
        // Not JSON
      }

      const { internalStatus, vendorStatus } = parseVendorResponse(responseBody, text);

      if (internalStatus === 'FAILED' || internalStatus === 'LIMIT_EXCEEDED') {
        return { trackingId: message.id, success: false, rawResponse: responseBody || text, error: vendorStatus };
      }

      return { trackingId: message.id, success: true, rawResponse: responseBody || text };
    } catch (err: any) {
      logger.error({ err }, 'ZNS HTTP error');
      return { trackingId: '', success: false, rawResponse: null, error: err.message };
    }
  }
}

export const znsVendor = new CnvZnsVendor();
