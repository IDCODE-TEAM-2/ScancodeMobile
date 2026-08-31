import React from 'react';
import { View, Text, ScrollView } from 'react-native';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-[15px] font-bold text-gray-900 mb-1.5">{title}</Text>
      <Text className="text-[13px] text-gray-600 leading-5">{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-5 pb-12">
      <Text className="text-xs text-gray-400 mb-5">Last updated: 31 August 2026</Text>

      <Section title="1. Information We Collect">
        Account information (username, email, password, account role) provided at
        registration; storefront and product information vendors add; order details (items,
        totals, table/order status); event Access Page guest check-in responses; and, if you
        enable notifications, a device push token used to deliver order and event updates.
      </Section>

      <Section title="2. How We Use Information">
        To operate your account and storefronts, process and display orders, deliver push
        notifications you've opted into, aggregate storefront ratings shown in the Storefront
        Directory, and maintain the security of the platform.
      </Section>

      <Section title="3. What We Don't Collect">
        We do not access your device's photo library or camera roll beyond the images you
        explicitly choose to upload, and we do not collect precise device location — the
        storefront "location" field is a state you select yourself, not GPS data.
      </Section>

      <Section title="4. Sharing With Third Parties">
        We share information with payment processors (for storefront QR activation and
        checkout payments) only as needed to complete a transaction, and with push notification
        infrastructure (Expo's push service) solely to deliver the notifications you've
        enabled. We do not sell your personal information to third parties.
      </Section>

      <Section title="5. Vendor & Guest Data">
        Information you submit on a vendor's Access Page (event check-in form) is shared with
        that vendor, who is separately responsible for how they use it. Review the event
        details before submitting personal information.
      </Section>

      <Section title="6. Data Retention">
        We retain account and order data for as long as your account is active, or as needed
        to comply with legal obligations. You may request deletion of your account and
        associated data by contacting support.
      </Section>

      <Section title="7. Your Rights">
        You may access, correct, or request deletion of your personal information at any time.
        Push notification permissions can be revoked from your device settings at any time.
      </Section>

      <Section title="8. Children's Privacy">
        ScanCode is not directed at children under 13, and we do not knowingly collect
        information from them.
      </Section>

      <Section title="9. Changes to This Policy">
        We may update this policy from time to time; material changes will be reflected here
        with a new "Last updated" date.
      </Section>

      <Section title="10. Contact">
        Questions about this policy can be sent to privacy@scancode.live.
      </Section>
    </ScrollView>
  );
}
