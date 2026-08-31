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

export default function TermsOfServiceScreen() {
  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-5 pb-12">
      <Text className="text-xs text-gray-400 mb-5">Last updated: 31 August 2026</Text>

      <Section title="1. Acceptance of Terms">
        By creating an account or using ScanCode, you agree to these Terms of Service. If you
        do not agree, please do not use the app. ScanCode is a QR-code table-ordering platform
        that connects vendors (restaurants, lounges, event hosts, and similar venues) with
        customers in Nigeria.
      </Section>

      <Section title="2. Account Types">
        ScanCode supports two account types: Vendor accounts, used to create and manage
        storefronts, products, orders, and event Access Pages; and Customer accounts, used to
        browse storefronts, place orders, and check in to events. A single account holds one
        role, chosen at registration. Customers may also use the app anonymously by scanning a
        table QR code, without creating an account.
      </Section>

      <Section title="3. Orders and Payments">
        Orders placed through a storefront are transactions between the customer and the
        vendor. Vendors are solely responsible for accepting, fulfilling, and pricing their
        orders, and for the accuracy of their bank account details. ScanCode does not hold
        customer funds or act as a party to the sale — payment is made directly to the vendor's
        listed bank account or through a supported payment processor at checkout. Storefront QR
        activation fees, where applicable, are processed through our payment partner.
      </Section>

      <Section title="4. Vendor Responsibilities">
        Vendors are responsible for the accuracy of their storefront listings, product
        descriptions, prices, stock levels, and event Access Page content, and for complying
        with applicable food-safety, business licensing, and consumer-protection laws. ScanCode
        does not review or endorse vendor content before publication.
      </Section>

      <Section title="5. Access Pages and Guest Data">
        Vendors creating event Access Pages are responsible for the fields they collect from
        guests and for how that data is used outside the app. Guests submitting check-in
        information do so voluntarily and should only provide information they are comfortable
        sharing with the event host.
      </Section>

      <Section title="6. Prohibited Conduct">
        You may not use ScanCode to post unlawful, fraudulent, or misleading content; to
        impersonate another person or business; to interfere with the app's operation; or to
        collect data from other users beyond what a storefront or Access Page legitimately
        requires.
      </Section>

      <Section title="7. Termination">
        We may suspend or terminate an account that violates these terms. Vendors may stop
        using the platform at any time; storefronts and Access Pages may be deactivated by
        their owner at any time.
      </Section>

      <Section title="8. Disclaimer & Limitation of Liability">
        ScanCode is provided "as is." We do not guarantee uninterrupted availability and are
        not liable for losses arising from vendor-customer transactions, order fulfillment, or
        event coordination conducted through the platform, to the fullest extent permitted by
        Nigerian law.
      </Section>

      <Section title="9. Changes to These Terms">
        We may update these terms from time to time. Continued use of the app after an update
        constitutes acceptance of the revised terms.
      </Section>

      <Section title="10. Governing Law">
        These terms are governed by the laws of the Federal Republic of Nigeria.
      </Section>

      <Section title="11. Contact">
        Questions about these terms can be sent to support@scancode.live.
      </Section>
    </ScrollView>
  );
}
