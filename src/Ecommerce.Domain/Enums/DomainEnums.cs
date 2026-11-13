namespace Ecommerce.Domain.Enums;

public enum ProductStatus
{
    Draft = 0,
    Published = 1,
    Archived = 2
}

public enum InventoryLocationType
{
    Own = 0,
    SupplierVirtual = 1
}

public enum FulfillmentModel
{
    ModelA_OwnStock = 0,
    ModelB_CrossDock = 1,
    ModelC_DirectSupplierDrop = 2
}

public enum CodCollectionMode
{
    OurCarrierAccount = 0,
    SupplierAccount = 1,
    NotSupported = 2
}

public enum StockReservationStatus
{
    Active = 0,
    Committed = 1,
    Released = 2,
    Expired = 3
}

public enum OrderStatus
{
    New = 0,
    AwaitingVerification = 1,
    Confirmed = 2,
    PartiallyFulfilled = 3,
    Completed = 4,
    Cancelled = 5,
    OnHold = 6
}

public enum PaymentStatus
{
    NotRequiredYet = 0,
    Pending = 1,
    Authorized = 2,
    Paid = 3,
    Failed = 4,
    Refunded = 5,
    PartiallyRefunded = 6
}

public enum FulfillmentStatus
{
    NotStarted = 0,
    Sourcing = 1,
    ReadyToPack = 2,
    Packed = 3,
    Shipped = 4,
    Delivered = 5,
    Exception = 6,
    Returned = 7
}

public enum PaymentMethod
{
    CashOnDelivery = 0,
    BankTransfer = 1,
    Card = 2
}

public enum PricingRuleScope
{
    Global = 0,
    Supplier = 1,
    Category = 2,
    Product = 3,
    ManualOverride = 4
}

public enum ImportRunStatus
{
    Running = 0,
    DryRunCompleted = 1,
    QuarantinedForReview = 2,
    Applied = 3,
    Failed = 4
}

public enum CodRemittanceStatus
{
    Open = 0,
    Matched = 1,
    Discrepancy = 2
}

public enum ArticleStatus
{
    Draft = 0,
    Review = 1,
    Published = 2
}

public enum AdminRole
{
    Operator = 0,
    OwnerAdmin = 1
}

public enum ReturnRequestType
{
    Withdrawal14Days = 0,
    WarrantyClaim24Months = 1,
    DamagedInTransit = 2
}

public enum ReturnRequestStatus
{
    Submitted = 0,
    AcknowledgedWithin8Days = 1,
    ApprovedAwaitingReturn = 2,
    ItemReceivedAndInspected = 3,
    Refunded = 4,
    Replaced = 5,
    Rejected = 6
}

public enum CourierProvider
{
    PostExpress = 0,
    Bex = 1,
    DExpress = 2,
    Aks = 3
}

public enum SupplierPoStatus
{
    Draft = 0,
    SentToSupplier = 1,
    ConfirmedBySupplier = 2,
    ReceivedOrDispatched = 3,
    Cancelled = 4
}
