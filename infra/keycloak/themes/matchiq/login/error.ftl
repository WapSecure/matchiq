<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
  <#if section = "header">
    ${msg("errorTitle")}
  <#elseif section = "form">
    <div id="kc-error-message" class="mq-stack">
      <p class="mq-body-text">${kcSanitize(message.summary)?no_esc}</p>
      <#if traceId??>
        <p class="mq-reference" id="traceId">${msg("traceIdSupportMessage", traceId)}</p>
      </#if>
      <#if !skipLink??>
        <a id="backToApplication" class="pf-v5-c-button pf-m-primary mq-block" href="${layout.appUrl()}">${msg("mqBackToApp")}</a>
      </#if>
    </div>
  </#if>
</@layout.registrationLayout>
