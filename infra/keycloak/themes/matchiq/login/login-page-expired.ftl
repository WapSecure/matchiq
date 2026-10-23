<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
  <#if section = "header">
    ${msg("pageExpiredTitle")}
  <#elseif section = "form">
    <div class="mq-stack">
      <p id="instruction1" class="mq-body-text">${msg("mqPageExpiredLead")}</p>
      <a id="loginContinueLink" class="pf-v5-c-button pf-m-primary mq-block" href="${url.loginAction}">${msg("mqContinueSignIn")}</a>
      <a id="loginRestartLink" class="pf-v5-c-button pf-m-secondary mq-block" href="${url.loginRestartFlowUrl}">${msg("mqRestartSignIn")}</a>
    </div>
  </#if>
</@layout.registrationLayout>
