import { vi } from './vi';

type Translations = typeof vi;

export const en: Translations = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search...',
    loading: 'Loading...',
    noData: 'No Data',
    actions: 'Actions',
    assignee: 'Assignee',
    unassigned: 'Unassigned',
    status: 'Status',
  },
  dataview: {
    grouping: 'Group by',
    sorting: 'Sort',
    filtering: 'Filter',
    viewAs: 'View as',
    columns: 'Columns',
    density: 'Density',
    export: 'Export',
    savedViews: 'Saved Views',
    saveCurrentView: 'Save View',
    aggregates: {
      count: 'Count',
      sum: 'Sum',
      avg: 'Avg',
      min: 'Min',
      max: 'Max',
    }
  },
  empty: {
    noCustomer: 'No Customers Yet',
    noCustomerDesc: 'Add your first customer to start tracking.',
    noCustomerInfo: 'No customer info',
    noNotes: 'No notes yet',
    noQuoteDoc: 'No quote documents uploaded for this customer.',
    noProvinceData: 'No province/city data',
    noActivity: 'No related activity.',
    noSpecialNotes: 'No special operation notes from caretaker.',
    noTemplates: 'No message templates yet',
    noChatId: 'No Chat ID configured.',
    noProducts: 'No products yet',
    noUsers: 'No users created.',
    noData: 'No data.',
    noMachineNum: 'No machine number',
    noQuoteNum: 'No quote number',
    noContractNum: 'No contract number',
    noPaymentNum: 'No payment number',
    noDeliveryNum: 'No delivery number',
  },
  missing: {
    contract: 'No contract',
    payment: 'No payment',
    delivery: 'No delivery',
    quote: 'No quote',
    date: 'N/A',
    info: 'N/A',
  },
  customer: {
    fields: {
      name: 'Customer',
      representative: 'Representative',
      address: 'Address',
      phone: 'Phone',
      stage: 'Stage',
      type: 'Type',
      channel: 'Channel',
    },
    empty: {
      title: 'No Customers Yet',
      description: 'Add your first customer to start tracking.',
    }
  },
  contract: {
    title: 'Contract',
    meta: 'Managing total {count} contracts',
    searchPlaceholder: 'Search by contract num, customer name...',
    fields: {
      contractNumber: 'Contract',
      orderNumber: 'Order',
      dateSigned: 'Date signed',
      expectedDate: 'Expected date',
      machineType: 'Machine type',
      machineCount: 'Count',
      paymentStatus: 'Payment',
      deliveryStatus: 'Delivery',
      znsStatus: 'ZNS Contract',
    },
    groups: {
      customerId: 'Customer',
      nguoiPhuTrach: 'Assignee',
      trangThaiGuiTinHopDong: 'ZNS Contract Status',
      ngayKyThang: 'Contract Month',
    },
    status: {
      unassigned: 'Unassigned',
      contractsCount: 'contracts',
      unpaidCount: 'unpaid',
      undeliveredCount: 'undelivered',
      filterGroup: 'Filter group',
    }
  },
  delivery: {
    fields: {
      deliveryNumber: 'Delivery Num',
      machineInfo: 'Machine info',
      date: 'Date',
      shipper: 'Shipper',
      znsStatus: 'ZNS Delivery',
    }
  },
  payment: {
    fields: {
      paymentNumber: 'Payment Num',
      totalAmount: 'Total',
      amount: 'Paid',
      dueDate: 'Due Date',
      znsStatus: 'ZNS Payment',
    }
  },
  quotation: {
    fields: {
      quoteNumber: 'Quote',
      total: 'Total',
      validUntil: 'Valid until',
      znsStatus: 'ZNS Quote'
    }
  },
  settings: {
    title: 'System Settings',
    subtitle: 'Manage operation parameters and third-party integrations',
    searchPlaceholder: 'Search configuration or feature...',
    saveSuccess: 'Config saved successfully',
    saveError: 'Error saving config',
    saveLocalBtn: 'Save Config',
    savingLocalBtn: 'Saving...',
    groups: {
      zns_automation: 'ZNS & Automation',
      data_integration: 'Data & Integration',
      system_admin: 'System Settings'
    }
  },
  znshub: {
    title: 'ZNS Hub & Logs',
    health_status: {
      good: 'GOOD',
      warning: 'WARNING',
      danger: 'DANGER'
    },
    rate_limit: 'Success Rate (last 100 logs)',
    total_log: 'Total Logs (last 100 logs)',
    dlq_count: 'DLQ / Failed',
    tabs: {
      outbox: 'Outbox (Active)',
      dlq: 'DLQ (Failed Queue)',
      debug: 'Webhook Debug',
      unmapped: 'Unmapped Payload'
    },
    tb: {
      time: 'Time',
      id: 'System ID',
      status: 'Status',
      target: 'Target / Entity',
      actions: 'Actions',
      provId: 'Provider ID',
      respCode: 'Response Code',
      summary: 'Summary',
      reason: 'Reason'
    },
    detail: {
      payloadTitle: 'Payload Details',
      compiledJson: 'Compiled JSON Data',
      sysErr: 'System Error / Response',
      normal_status: 'Healthy Operation (no specific log).',
      btn_retry_single: 'Retry (Retry Workflow)',
      copied: 'Copied',
      copy: 'Copy'
    }
  },
  audit: {
    title: 'Activity Logs',
    subtitle: 'Track and audit system changes and activities',
    last_24h: 'Events (24h)',
    active_users: 'Active Users',
    filter_all: 'All',
    fields: {
      user: 'User',
      entity_type: 'Module',
      action: 'Action',
      ref_id: 'Reference Entity ID'
    },
    timeline: {
      searchPlaceholder: 'Search ID, User, Action, Module...',
      selectLog: 'Select an event to view details',
      selectLogDesc: 'Recorded data will be displayed here',
      before: 'Before',
      after: 'After',
      compiled_title: 'Recorded Data (Payload / Diff)'
    }
  }
};
